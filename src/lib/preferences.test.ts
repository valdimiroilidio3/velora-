import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultPreferences,
  isMotionReduced,
  parsePreferences,
  PREFERENCES_STORAGE_KEY,
  resolveTheme,
  serializePreferences,
  type Preferences,
} from "./preferences";

describe("parsePreferences", () => {
  it("tolera ausência e corrupção de dados", () => {
    expect(parsePreferences(null)).toEqual(defaultPreferences);
    expect(parsePreferences("")).toEqual(defaultPreferences);
    expect(parsePreferences("{")).toEqual(defaultPreferences);
    expect(parsePreferences("[]")).toEqual(defaultPreferences);
    expect(parsePreferences('"string"')).toEqual(defaultPreferences);
  });

  it("descarta escolhas inexistentes em vez de as confiar", () => {
    const parsed = parsePreferences(
      '{"theme":"neon","density":"compact","motion":"reduced","sceneQuality":"ludicrous"}',
    );
    expect(parsed).toEqual({
      theme: "system",
      density: "compact",
      motion: "reduced",
      sceneQuality: "auto",
    });
  });

  it("faz a ida e volta com o formato serializado", () => {
    const value: Preferences = {
      theme: "dark",
      density: "compact",
      motion: "reduced",
      sceneQuality: "detailed",
    };
    expect(parsePreferences(serializePreferences(value))).toEqual(value);
  });
});

describe("resolução de preferências do sistema", () => {
  it("tema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("movimento", () => {
    expect(isMotionReduced("system", true)).toBe(true);
    expect(isMotionReduced("system", false)).toBe(false);
    // A escolha manual vence sempre o sistema: é o controlo que a pessoa tem sobre a animação.
    expect(isMotionReduced("reduced", false)).toBe(true);
  });
});

describe("contrato entre o script de arranque e applyPreferences", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const source = readFileSync(new URL("./preferences.ts", import.meta.url), "utf8");

  it("as chaves de dataset são as mesmas nos dois lados", () => {
    const scriptKeys = [...layout.matchAll(/root\.dataset\.([a-zA-Z]+)/g)].map((match) => match[1]);
    const moduleKeys = [...source.matchAll(/root\.dataset\["([a-zA-Z]+)"\]/g)].map((match) => match[1]);
    expect(scriptKeys.length).toBeGreaterThanOrEqual(4);
    expect(new Set(scriptKeys)).toEqual(new Set(moduleKeys));
  });

  it("o script lê a mesma chave de armazenamento e os mesmos valores por omissão", () => {
    // O script não repete a chave: interpola a constante. Se alguém escrever a chave à mão
    // nos dois lados, a divergência passa despercebida até ao primeiro utilizador.
    expect(layout).toContain("PREFERENCES_STORAGE_KEY");
    expect(layout).toContain("${PREFERENCES_STORAGE_KEY}");
    expect(PREFERENCES_STORAGE_KEY).toBe("velora.preferences.v1");
    expect(layout).toContain("root.dataset.theme = resolved");
    expect(layout).toContain('density === "compact" ? "compact" : "comfortable"');
    expect(layout).toContain('reduced ? "reduced" : "full"');
  });

  it("nenhum dos dois escreve fora do documento (sem pedido de rede, sem cookies)", () => {
    expect(layout).not.toMatch(/fetch\(|document\.cookie|localStorage\.setItem/);
    expect(source).not.toMatch(/fetch\(|document\.cookie/);
  });
});
