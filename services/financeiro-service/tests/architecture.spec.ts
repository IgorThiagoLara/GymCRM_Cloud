import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../src");
const BUILTINS = new Set(["crypto", "fs", "path"]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".ts") ? [path.join(dir, e.name)] : []
  );
}

function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  return [...src.matchAll(/(?:import|export)[^'"]*?from\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

interface Info { slice: string; layer: string }
function locate(abs: string): Info | "shared" | "root" {
  const rel = path.relative(SRC, abs).split(path.sep);
  if (rel[0] === "shared") return "shared";
  if (rel[0] === "features") return { slice: `${rel[1]}/${rel[2]}`, layer: rel[3] };
  return "root";
}

const ALLOWED: Record<string, string[]> = {
  domain: ["domain"],
  application: ["domain", "application"],
  infrastructure: ["domain", "application", "infrastructure"],
  presentation: ["domain", "application", "presentation"],
};
const SHARED_ALLOWED_FOR_INNER = ["kernel", "events"]; 

const files = walk(SRC).filter((f) => locate(f) !== "root");
const violacoes: string[] = [];

for (const file of files) {
  const me = locate(file) as Info | "shared";
  const rel = path.relative(SRC, file);

  for (const imp of importsOf(file)) {
    const isRelative = imp.startsWith(".");
    if (!isRelative) {
      if (me !== "shared" && typeof me !== "string" && ["domain", "application"].includes(me.layer) && !BUILTINS.has(imp)) {
        violacoes.push(`${rel}: camada ${me.layer} não pode importar pacote externo "${imp}"`);
      }
      continue;
    }
    const target = path.resolve(path.dirname(file), imp);
    const t = locate(target) as Info | "shared" | "root";

    if (me === "shared") {
      if (t !== "shared") violacoes.push(`${rel}: shared não pode importar features (${imp})`);
      continue;
    }
    if (t === "shared") {
      const sub = path.relative(SRC, target).split(path.sep)[1];
      if (["domain", "application"].includes(me.layer) && !SHARED_ALLOWED_FOR_INNER.includes(sub)) {
        violacoes.push(`${rel}: camada ${me.layer} só pode usar shared/kernel e shared/events (usou shared/${sub})`);
      }
      continue;
    }
    if (typeof t === "string") continue;
    if (t.slice !== me.slice) {
      violacoes.push(`${rel}: slice ${me.slice} importa o slice ${t.slice} (proibido; use eventos)`);
      continue;
    }
    if (!ALLOWED[me.layer].includes(t.layer)) {
      violacoes.push(`${rel}: camada ${me.layer} não pode depender de ${t.layer} (regra de dependência)`);
    }
  }
}

describe("Arquitetura (Clean Architecture + Vertical Slice)", () => {
  it("encontra arquivos de slices para validar", () => {
    expect(files.length).toBeGreaterThan(10);
  });
  it("não possui violações da regra de dependência nem acoplamento entre slices", () => {
    expect(violacoes).toEqual([]);
  });
});
