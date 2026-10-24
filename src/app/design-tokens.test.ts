import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * O design system é a contrato; este teste é o verificador do contrato.
 *
 * Porque é um teste a ler o CSS em vez de uma tabela anotada à mão: a tabela descrevia o que
 * o sistema *deveria* ser, e isto mede o que ele *é*. Se alguém escurecer um token de texto
 * para "ficar mais suave", o portão de acessibilidade fecha.
 */

const CSS = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function tokensIn(block: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (block === null) return out;
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      out[name] = value;
    }
  }
  return out;
}

const light = tokensIn(/:root\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? null);
const dark = tokensIn(/\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? null);

function toRgb(value: string): [number, number, number] {
  let hex = value.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

const channel = (raw: number) => {
  const value = raw / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = ([red, green, blue]: [number, number, number]) =>
  0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);

/** Contraste WCAG 2.1 (1.4.3 / 1.4.11), calculado aqui para não depender de opinião. */
export function contrast(foreground: string | undefined, background: string | undefined): number {
  if (foreground === undefined || background === undefined) {
    throw new Error("token inexistente — o teste precisa do nome correto");
  }
  const first = luminance(toRgb(foreground));
  const second = luminance(toRgb(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/** Pares de texto: todos têm de atingir AA (4.5:1) em corpo normal. */
const TEXT_PAIRS: readonly [string, string][] = [
  ["ink", "canvas"],
  ["ink", "surface"],
  ["ink", "canvas-sunken"],
  ["ink-secondary", "canvas"],
  ["ink-secondary", "surface"],
  ["ink-secondary", "canvas-sunken"],
  ["ink-muted", "surface"],
  ["ink-muted", "canvas"],
  ["ink-muted", "canvas-sunken"],
  ["ink-on-accent", "accent"],
  ["ink-on-inverse", "surface-inverse"],
  ["accent", "surface"],
  ["accent-ink", "accent-soft"],
  ["danger", "surface"],
  ["danger", "danger-soft"],
  ["warning", "surface"],
  ["warning", "warning-soft"],
  ["success", "surface"],
  ["success", "success-soft"],
  ["info", "surface"],
  ["info", "info-soft"],
];

describe("contraste de texto (AA 4.5:1)", () => {
  it.each(TEXT_PAIRS)("%s sobre %s", (foreground, background) => {
    expect(contrast(light[foreground], light[background])).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(dark[foreground] ?? light[foreground], dark[background] ?? light[background]),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contraste de componentes (3:1)", () => {
  it("o traço de foco sobressai em qualquer superfície", () => {
    for (const theme of [light, dark]) {
      expect(contrast(theme["focus"], theme["canvas"])).toBeGreaterThanOrEqual(3);
      expect(contrast(theme["focus"], theme["surface"])).toBeGreaterThanOrEqual(3);
    }
  });

  it("a borda de controlo separa o campo do fundo", () => {
    for (const theme of [light, dark]) {
      expect(contrast(theme["line-control"], theme["surface"])).toBeGreaterThanOrEqual(3);
      expect(contrast(theme["line-control"], theme["canvas"])).toBeGreaterThanOrEqual(3);
    }
  });

  it("a seleção não depende de 1px de cor: o acento tem de se ver na superfície", () => {
    expect(contrast(light["accent"], light["surface"])).toBeGreaterThanOrEqual(3);
    expect(
      contrast(dark["accent"] ?? light["accent"], dark["surface"] ?? light["surface"]),
    ).toBeGreaterThanOrEqual(3);
  });
});

function sources(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      sources(path, files);
    } else if (/\.(tsx?|mts)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe("o terceiro nível de tinta não é texto", () => {
  it("nenhum componente usa --ink-faint como cor de letra", () => {
    const offenders = sources(fileURLToPath(new URL("../", import.meta.url)))
      .filter((file) => readFileSync(file, "utf8").includes("text-ink-faint"))
      .map((file) => file.split("/src/")[1] ?? file);
    expect(offenders).toEqual([]);
  });

  it("--ink-faint fica reservado a traços e estados desativados", () => {
    expect(contrast(light["ink-faint"], light["surface"])).toBeLessThan(4.5);
    expect(contrast(light["ink-faint"], light["line"])).toBeGreaterThan(1.2);
  });
});

describe("identidade visual: restrições do sistema", () => {
  it("não há gradientes, brilho ou vidro — exceto a malha de desenho", () => {
    // A `.blueprint-grid` é a única exceção: usa `linear-gradient` como régua de 1px, não como
    // preenchimento decorativo. Isolar a regra em vez de desativar o teste mantém o resto vigiado.
    const withoutBlueprintMesh = CSS.replace(/\.blueprint-grid\s*\{[^}]*\}/s, "");
    expect(withoutBlueprintMesh).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/);
    expect(CSS).not.toMatch(/backdrop-filter\s*:/);
    expect(CSS).not.toMatch(/text-shadow\s*:/);
    expect(CSS).not.toMatch(/box-shadow:[^;]*0 0 (2|3|4)\d\s+\d+px\s+var\(--accent/);
  });

  it("as sombras são três níveis discretos, nada de elevações decorativas", () => {
    const shadows = [...CSS.matchAll(/--shadow-(e\d):\s*([^;]+);/g)];
    expect(shadows.map((match) => match[1])).toEqual(["e1", "e2", "e3"]);
    for (const [, , value] of shadows) {
      const blurs = [...(value ?? "").matchAll(/(\d+)px/g)].map((match) => Number(match[1]));
      expect(Math.max(...blurs)).toBeLessThanOrEqual(40);
    }
  });

  it("os raios pertencem à escala 2–12 px", () => {
    const radii = [...CSS.matchAll(/--radius-(?:xs|sm|md|lg|xl):\s*(\d+)px/g)].map((match) =>
      Number(match[1]),
    );
    expect(radii.length).toBeGreaterThanOrEqual(5);
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...radii)).toBeLessThanOrEqual(12);
  });

  it("o movimento é curto e é cortado por prefers-reduced-motion", () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    const durations = [...CSS.matchAll(/transition[^;]*?(\d+(?:\.\d+)?)s/g)].map(
      (match) => Number(match[1]) * 1000,
    );
    const animations = [...CSS.matchAll(/animation:[^;]*?(\d+(?:\.\d+)?)s/g)].map(
      (match) => Number(match[1]) * 1000,
    );
    const longest = Math.max(...durations, ...animations);
    expect(longest).toBeLessThanOrEqual(1600); // só o pulso do skeleton; interações ficam ≤320ms
  });

  it("um único acento saturado serve as duas famílias de estado", () => {
    expect(light["accent"]).toBe("#0f4f47");
    expect(dark["accent"]).toBe("#6fc0b1");
    // Mesma família em ambos os temas: não há um "azul tecnológico" emprestado de template.
    expect(light["accent-ink"]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
