import http from "http";
import { AddressInfo } from "net";
import { AzureFunctionEmailSender } from "../src/features/notificacoes/enviar-email/infrastructure/AzureFunctionEmailSender";
import { FalhaSimuladaEmailSender } from "../src/features/notificacoes/enviar-email/infrastructure/FalhaSimuladaEmailSender";

function servidor(handler: (req: http.IncomingMessage, body: string, res: http.ServerResponse) => void): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => handler(req, body, res));
    }).listen(0, () => resolve({ url: `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/enviar-email`, close: () => srv.close() }));
  });
}
const msg = { destinatario: "a@x.com", assunto: "Oi", corpo: "Texto", referencia: "evt-1", correlationId: "corr-1" };

describe("AzureFunctionEmailSender (integração com a Azure Function)", () => {
  it("POST com function key, correlation-id e idempotency-key; corpo com os dados do e-mail", async () => {
    let capturado: any;
    const srv = await servidor((req, body, res) => { capturado = { headers: req.headers, body: JSON.parse(body), method: req.method }; res.statusCode = 202; res.end(); });
    await new AzureFunctionEmailSender({ url: srv.url, functionKey: "chave-123" }).enviar(msg);
    srv.close();
    expect(capturado.method).toBe("POST");
    expect(capturado.headers["x-functions-key"]).toBe("chave-123");
    expect(capturado.headers["x-idempotency-key"]).toBe("evt-1");
    expect(capturado.headers["x-correlation-id"]).toBe("corr-1");
    expect(capturado.body.destinatario).toBe("a@x.com");
  });

  it("resposta não-2xx lança erro (para o consumidor registrar FALHA e o broker fazer retry)", async () => {
    const srv = await servidor((_req, _b, res) => { res.statusCode = 500; res.end(); });
    await expect(new AzureFunctionEmailSender({ url: srv.url }).enviar(msg)).rejects.toThrow("HTTP 500");
    srv.close();
  });

  it("FalhaSimuladaEmailSender falha N vezes e depois delega", async () => {
    const enviados: any[] = [];
    const s = new FalhaSimuladaEmailSender({ enviar: async (m) => { enviados.push(m); } }, 2);
    await expect(s.enviar(msg)).rejects.toThrow("falha simulada");
    await expect(s.enviar(msg)).rejects.toThrow("falha simulada");
    await s.enviar(msg);
    expect(enviados).toHaveLength(1);
  });
});
