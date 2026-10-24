import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O teste da fronteira do `three`.
 *
 * A arquitetura diz que o `three` só entra pela porta do palco, carregada em diferido
 * (`dynamic(..., { ssr: false })`). Isso é fácil de partir sem dar por nada — basta importar um
 * módulo do motor, como uma lista de etiquetas de vista, para que 135 kB de gzip entrem no
 * *first-load* de uma rota que nem WebGL tem. Este teste é a única forma mecânica de o garantir
 * neste ambiente (não há análise de chunks do Turbopack por rota).
 *
 * A exceção é nomeada e é uma linha: `viewport-3d.tsx`. Tudo o resto da UI só pode importar a
 * camada pura (`src/three/*.ts`, sem `three`) e importações `import type`.
 */

const ROOT = join(process.cwd(), "src");

/**
 * Os dois únicos módulos que falam com o `three` em runtime. Cada um deles está atrás de um
 * `dynamic(…, { ssr: false })` — e a linha a baixo do mapa verifica exatamente isso, para que a
 * exceção não se transforme numa porta aberta.
 */
const ENGINE_ENTRIES: Record<string, string> = {
  [join(ROOT, "components", "editor", "viewport-3d.tsx")]: join(
    ROOT,
    "components",
    "editor",
    "editor-view.tsx",
  ),
  [join(ROOT, "components", "scene", "volume-scene.ts")]: join(
    ROOT,
    "components",
    "scene",
    "scene-stage.tsx",
  ),
};

/** Um `import type` é apaguado no build; não conta como dependência runtime. */
const RUNTIME_IMPORT = /^\s*import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/;
const RUNTIME_SIDE_EFFECT = /^\s*import\s+"([^"]+)"/;

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "three") {
        files(path, out);
      }
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function importsOf(path: string): string[] {
  const lines = readFileSync(path, "utf8").split("\n");
  const found: string[] = [];
  for (const line of lines) {
    const match = RUNTIME_IMPORT.exec(line) ?? RUNTIME_SIDE_EFFECT.exec(line);
    if (match?.[1] !== undefined) {
      found.push(match[1]);
    }
  }
  return found;
}

describe("fronteira do motor 3D", () => {
  const uiFiles = files(join(ROOT, "components")).concat(files(join(ROOT, "app")));

  it("varre um número plausível de módulos de UI", () => {
    expect(uiFiles.length).toBeGreaterThan(30);
  });

  it("fora das portas nomeadas, ninguém importa three em runtime", () => {
    const offenders: string[] = [];
    for (const file of uiFiles) {
      if (file in ENGINE_ENTRIES) {
        continue;
      }
      const bad = importsOf(file).filter(
        (specifier) =>
          specifier.startsWith("three") ||
          specifier.startsWith("@/three/engine") ||
          specifier.startsWith("@three"),
      );
      if (bad.length > 0) {
        offenders.push(`${file.replace(`${ROOT}/`, "")}: ${bad.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Percorre dois graus: ou o módulo com `three` é importado por `dynamic(…, { ssr: false })`, ou é
   * importado estaticamente por alguém que o é. É a diferença entre "o `three` está numa rota" e
   * "o `three` está em todas as rotas".
   */
  function dynamicBoundaryFor(moduleName: string): string | null {
    const direct = new RegExp(`import\\((["'])([^"']*/${moduleName})\\1\\)`);
    const staticImport = new RegExp(`from "([^"]*/${moduleName})"`);
    for (const file of uiFiles) {
      const source = readFileSync(file, "utf8");
      if (direct.test(source) && source.includes("ssr: false")) {
        return file;
      }
      if (staticImport.test(source)) {
        const name =
          file
            .split("/")
            .pop()
            ?.replace(/\.tsx?$/, "") ?? "";
        const parent = dynamicBoundaryFor(name);
        if (parent !== null) {
          return parent;
        }
      }
    }
    return null;
  }

  it("cada porta do motor está atrás de um dynamic com ssr: false", () => {
    const boundaries: Record<string, string | null> = {};
    for (const entry of Object.keys(ENGINE_ENTRIES)) {
      const name =
        entry
          .split("/")
          .pop()
          ?.replace(/\.tsx?$/, "") ?? "";
      boundaries[name] = dynamicBoundaryFor(name);
    }
    expect(boundaries).toEqual({
      "viewport-3d": expect.any(String),
      "volume-scene": expect.any(String),
    });
  });

  it("as portas falam mesmo com o motor", () => {
    for (const entry of Object.keys(ENGINE_ENTRIES)) {
      const specifiers = importsOf(entry);
      expect(
        specifiers.some(
          (specifier) => specifier.startsWith("three") || specifier.startsWith("@/three/engine"),
        ),
        entry,
      ).toBe(true);
    }
  });

  it("nenhum módulo da camada pura importa three", () => {
    const pure = files(join(ROOT, "three")).filter((file) => !file.includes(`${join("three", "engine")}`));
    expect(pure.length).toBeGreaterThan(8);
    for (const file of pure) {
      if (statSync(file).isDirectory()) continue;
      const bad = importsOf(file).filter((specifier) => specifier.startsWith("three"));
      expect(bad, file.replace(`${ROOT}/`, "")).toEqual([]);
    }
  });
});
