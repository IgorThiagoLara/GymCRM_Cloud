import { Downstream } from "../types";
import { HttpJson } from "./HttpJson";

export interface DownstreamUrls { cadastros: string; matriculas: string; financeiro: string; notificacoes: string }

export function httpDownstream(urls: DownstreamUrls): Downstream {
  const cad = new HttpJson("cadastros", urls.cadastros);
  const mat = new HttpJson("matriculas", urls.matriculas);
  const fin = new HttpJson("financeiro", urls.financeiro);
  const not = new HttpJson("notificacoes", urls.notificacoes);
  return {
    cadastros: {
      alunos: (s) => cad.getOk("/alunos", s),
      planos: (s) => cad.getOk("/planos", s),
    },
    matriculas: {
      listar: (s) => mat.getOk("/matriculas", s),
      eventos: (s) => mat.getOk("/eventos?limite=100", s),
      criar: (s, body) => mat.request("POST", "/matriculas", s, body),
    },
    financeiro: {
      cobrancas: (s) => fin.getOk("/cobrancas", s),
      eventos: (s) => fin.getOk("/eventos?limite=100", s),
    },
    notificacoes: {
      listar: (s) => not.getOk("/notificacoes", s),
      eventos: (s) => not.getOk("/eventos?limite=100", s),
    },
  };
}
