import { describe, expect, it } from "vitest";
import {
  filterProjects,
  isQueryActive,
  matchesQuery,
  normalize,
  searchTokens,
  statusCounts,
  summarizeProjects,
  toProjectQuery,
  availabilityRatio,
} from "./query";
import { demoProjects, projectUnitTotals } from "./projects";

/**
 * Testes do motor de consulta do catálogo. São eles que sustentam a afirmação de que
 * "pesquisa e filtros funcionam": se um critério de ordenação mudar de sinal, isto rebenta.
 */
describe("normalize", () => {
  it("ignora acentos, maiúsculas e espaços repetidos", () => {
    expect(normalize("  TERRAÇO   das  Mares  ")).toBe("terraco das mares");
  });

  it("resolve por NFD de forma estável para caracteres portugueses", () => {
    expect(normalize("São João")).toBe("sao joao");
    expect(normalize("ç")).toBe("c");
  });
});

describe("matchesQuery", () => {
  it("exige que todos os termos apareçam (AND), em qualquer campo indexado", () => {
    const project = demoProjects[0];
    expect(project).toBeDefined();
    if (project === undefined) return;
    expect(matchesQuery(project, "porto reabilitação")).toBe(true);
    expect(matchesQuery(project, "porto lisboa")).toBe(false);
  });

  it("não indexa o rótulo do estado: o filtro de estado é trabalho do seletor", () => {
    // Fronteira deliberada, escrita aqui para não ser descoberta por acaso: a pesquisa cobre
    // texto descritivo; estados são um eixo próprio (param `status`) porque são um conjunto finito.
    expect(demoProjects.some((project) => matchesQuery(project, "publicado"))).toBe(false);
  });

  it("procura por código e por tipologia sem depender do nome visível", () => {
    expect(demoProjects.filter((project) => matchesQuery(project, "DEMO-03"))).toHaveLength(1);
    expect(demoProjects.filter((project) => matchesQuery(project, "t4")).length).toBeGreaterThan(0);
    expect(demoProjects.some((project) => matchesQuery(project, "t9"))).toBe(false);
  });

  it("termo vazio não filtra nada", () => {
    expect(searchTokens("   ")).toEqual([]);
    expect(demoProjects.filter((project) => matchesQuery(project, "  "))).toHaveLength(demoProjects.length);
  });
});

describe("filterProjects", () => {
  it("filtra por estado", () => {
    const published = filterProjects(demoProjects, { q: "", status: "published", sort: "updated" });
    expect(published.length).toBeGreaterThan(0);
    expect(published.every((project) => project.status === "published")).toBe(true);
  });

  it("ordena por data decrescente por omissão", () => {
    const result = filterProjects(demoProjects, { q: "", status: "all", sort: "updated" });
    const dates = result.map((project) => project.updatedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("ordena por nome com acentos ignorados", () => {
    const result = filterProjects(demoProjects, { q: "", status: "all", sort: "name" });
    const names = result.map((project) => normalize(project.name));
    expect([...names].sort()).toEqual(names);
  });

  it("ordena por disponibilidade: frações livres em absoluto, nome como desempate", () => {
    const result = filterProjects(demoProjects, { q: "", status: "all", sort: "availability" });
    const counts = result.map((project) => projectUnitTotals(project).available);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    // Proporção é outra pergunta (e é o que a barra do cartão mostra); a ordenação é absolutos.
    expect(availabilityRatio(result[0] ?? demoProjects[0]!)).toBeLessThanOrEqual(1);
  });

  it("ordena por preço e empurra projetos sem preço para o fim", () => {
    const withNull = [
      { ...demoProjects[0]!, priceFromEur: null },
      { ...demoProjects[1]!, priceFromEur: 200_000 },
      { ...demoProjects[2]!, priceFromEur: 900_000 },
    ];
    const result = filterProjects(withNull, { q: "", status: "all", sort: "price" });
    expect(result.map((project) => project.priceFromEur)).toEqual([200_000, 900_000, null]);
  });

  it("combina pesquisa + estado sem perder o critério", () => {
    const result = filterProjects(demoProjects, { q: "porto", status: "archived", sort: "name" });
    for (const project of result) {
      expect(project.status).toBe("archived");
      expect(matchesQuery(project, "porto")).toBe(true);
    }
  });
});

describe("toProjectQuery", () => {
  it("aceita valores válidos do URL", () => {
    expect(toProjectQuery({ q: "porto", status: "published", sort: "price" })).toEqual({
      q: "porto",
      status: "published",
      sort: "price",
    });
  });

  it("cai no valor por omissão para entradas inventadas ou repetidas", () => {
    expect(toProjectQuery({ status: "hacked", sort: "drop-table", q: "" })).toEqual({
      q: "",
      status: "all",
      sort: "updated",
    });
    expect(toProjectQuery({ status: ["published", "draft"] }).status).toBe("published");
  });

  it("limita o comprimento da pesquisa (não há entrada infinita)", () => {
    const long = "a".repeat(400);
    expect(toProjectQuery({ q: long }).q).toHaveLength(120);
  });
});

describe(" agregados", () => {
  it("statusCounts soma todas as chaves", () => {
    const counts = statusCounts(demoProjects);
    expect(counts.all).toBe(demoProjects.length);
    expect(counts.draft + counts.in_review + counts.published + counts.archived).toBe(demoProjects.length);
  });

  it("summarizeProjects encontra a data mais recente como string ISO", () => {
    const summary = summarizeProjects(demoProjects);
    expect(summary.total).toBe(demoProjects.length);
    expect(summary.availableUnits).toBeLessThan(summary.totalUnits);
    expect(summary.lastUpdated).toBe(
      [...demoProjects]
        .map((project) => project.updatedAt)
        .sort()
        .reverse()[0],
    );
  });

  it("summarizeProjects com lista vazia não inventa data", () => {
    expect(summarizeProjects([]).lastUpdated).toBeNull();
    expect(isQueryActive({ q: "", status: "all", sort: "updated" })).toBe(false);
    expect(isQueryActive({ q: "x", status: "all", sort: "updated" })).toBe(true);
  });
});
