import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatAreaRange,
  formatDate,
  formatDateTime,
  formatPercent,
  formatPrice,
  formatRelative,
  initials,
} from "./format";
import { isEmailShape, MIN_PASSWORD_LENGTH, validateAccessForm } from "./access-validation";

/** Âncora de tempo: nada disto pode depender do relógio do CI. */
const NOW = new Date("2026-10-24T09:00:00Z");

describe("formatDate / formatDateTime", () => {
  it("usa o locale pt-PT por omissão e aceita a data como string ISO", () => {
    expect(formatDate("2026-10-19T15:20:00Z", "pt-PT")).toMatch(/19 de outubro de 2026|^19 outubro 2026$/);
    expect(formatDateTime("2026-10-19T15:20:00Z", "en-GB")).toMatch(/19 Oct 2026/);
  });

  it("mantém os zeros à esquerda do dia", () => {
    expect(formatDate("2026-01-05T00:00:00Z", "en-GB")).toMatch(/^05 January 2026$/);
  });
});

describe("formatRelative", () => {
  it("agrupa em unidades crescentes", () => {
    expect(formatRelative("2026-10-23T09:00:00Z", "pt-PT", NOW)).toContain("ontem");
    expect(formatRelative("2026-10-21T09:00:00Z", "pt-PT", NOW)).toContain("3 dias");
    expect(formatRelative("2026-09-24T09:00:00Z", "pt-PT", NOW)).toContain("mês");
    expect(formatRelative("2025-10-24T09:00:00Z", "pt-PT", NOW)).toContain("ano");
  });

  it("datas futuras nunca usam «há» — `numeric: auto` resolve em «depois de amanhã»", () => {
    expect(formatRelative("2026-10-26T09:00:00Z", "pt-PT", NOW)).toBe("depois de amanhã");
    expect(formatRelative("2026-10-24T10:00:00Z", "pt-PT", NOW)).not.toContain("há");
  });
});

describe("unidades e preços", () => {
  it("área com uma casa decimal e símbolo m²", () => {
    expect(formatArea(78)).toBe("78 m²");
    expect(formatArea(78.45, "en-GB")).toBe("78.5 m²");
  });

  it("intervalo degenerado mostra um só valor", () => {
    expect(formatAreaRange(78, 78)).toBe("78 m²");
    expect(formatAreaRange(54, 156)).toBe("54 m² – 156 m²");
  });

  it("preço em euros sem decimais; sem preço é «Sob consulta»", () => {
    expect(formatPrice(348_000, "en-GB")).toBe("€348,000");
    expect(formatPrice(null)).toBe("Sob consulta");
  });

  it("percentagem arredondada sem decimais", () => {
    expect(formatPercent(0.4883, "en-GB")).toBe("49%");
    expect(formatPercent(1, "en-GB")).toBe("100%");
  });
});

describe("initials", () => {
  it("no máximo duas iniciais, com hífenes a separar", () => {
    expect(initials("Ana Duarte")).toBe("AD");
    expect(initials("Ana Beatriz Duarte Silva")).toBe("AB");
    expect(initials("Duarte")).toBe("D");
  });
});

describe("isEmailShape", () => {
  it("aceita formas comuns", () => {
    for (const value of ["a@b.pt", "ana.duarte@promontorio.co", "n+tag@sub.dominio.com"]) {
      expect(isEmailShape(value)).toBe(true);
    }
  });

  it("rejeita o que um utilizador esquecido escreveria", () => {
    for (const value of [
      "",
      "   ",
      "ana",
      "ana@",
      "@dominio.pt",
      "ana@dominio",
      "ana@dominio.",
      "a@b@c.pt",
      "a b@c.pt",
    ]) {
      expect(isEmailShape(value)).toBe(false);
    }
  });

  it("não aceita TLD numérico nem parte local demasiado longa", () => {
    expect(isEmailShape("ana@dominio.123")).toBe(false);
    expect(isEmailShape(`${"a".repeat(70)}@dominio.pt`)).toBe(false);
  });
});

describe("validateAccessForm", () => {
  it("sem valores: os dois campos acusam", () => {
    expect(validateAccessForm({ email: "", password: "" })).toEqual({
      email: "Indica o e-mail da conta.",
      password: "A palavra-passe não pode ficar vazia.",
    });
  });

  it("palavra-passe curta diz o mínimo", () => {
    const errors = validateAccessForm({ email: "a@b.pt", password: "123" });
    expect(errors.password).toContain(String(MIN_PASSWORD_LENGTH));
    expect(errors.email).toBeUndefined();
  });

  it("combinação válida não produz erros", () => {
    expect(validateAccessForm({ email: "  ana@dominio.pt  ", password: "12345678" })).toEqual({});
  });
});
