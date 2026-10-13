import { createHmac, timingSafeEqual } from "crypto";

export interface Claims { sub: string; tenantId: string; perfil: string; exp?: number; nbf?: number; [k: string]: unknown }

export function verifyHs256(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Claims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    if (header.alg !== "HS256") return null;
    const esperado = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    const recebido = Buffer.from(s, "base64url");
    if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;
    const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Claims;
    if (typeof claims.exp === "number" && claims.exp <= nowSec) return null;
    if (typeof claims.nbf === "number" && claims.nbf > nowSec) return null;
    if (!claims.sub || !claims.tenantId || !claims.perfil) return null;
    return claims;
  } catch {
    return null;
  }
}
