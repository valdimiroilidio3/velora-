import { describe, expect, it } from "vitest";
import { evaluatePeerDependencies, ALLOWLIST } from "./check-peer-deps.mjs";
import { evaluate } from "./bundle-budget.mjs";

/**
 * Os portões também são código: se a lógica de aceitar/exceção estiver errada, o CI fica
 * verde pelo motivo errado. Estes casos exercitam os dois sentidos de cada portão.
 */

const PEERS_REPORT = {
  ".": {
    bad: {
      eslint: (ALLOWLIST ?? []).slice(0, 3).map((rule) => ({
        parents: [{ name: rule.parent, version: "1.0.0" }],
        optional: false,
        wantedRange: "^9",
        foundVersion: "10.0.0",
      })),
    },
    missing: {},
    conflicts: [],
  },
};

describe("check-peer-deps", () => {
  it("aceita os achados cobertos pela lista de exceções", () => {
    const { unexpected, stale, accepted } = evaluatePeerDependencies(PEERS_REPORT);
    expect(accepted).toHaveLength(3);
    expect(unexpected).toEqual([]);
    expect(stale).toEqual([]);
  });

  it("falha quando aparece um par novo sem exceção", () => {
    const report = JSON.parse(JSON.stringify(PEERS_REPORT));
    report["."].bad.eslint.push({
      parents: [{ name: "eslint-plugin-something-new", version: "2.0.0" }],
      optional: false,
      wantedRange: "^8",
      foundVersion: "10.0.0",
    });
    const { unexpected } = evaluatePeerDependencies(report);
    expect(unexpected.map((finding) => finding.parent)).toEqual(["eslint-plugin-something-new"]);
  });

  it("falha quando uma exceção deixa de corresponder a nada (dívida obsoleta)", () => {
    const report = JSON.parse(JSON.stringify(PEERS_REPORT));
    report["."].bad.eslint = report["."].bad.eslint.slice(1);
    const { stale } = evaluatePeerDependencies(report);
    expect(stale.map((rule) => rule.parent)).toEqual([ALLOWLIST[0]?.parent]);
  });

  it("não aceita pares em falta ou em conflito, sejam eles quais forem", () => {
    const { unexpected } = evaluatePeerDependencies({
      ".": { missing: { react: ["algum-pacote"] }, conflicts: [] },
    });
    expect(unexpected).toHaveLength(1);
    expect(unexpected[0]?.kind).toBe("missing");
  });
});

describe("bundle-budget", () => {
  const okResult = {
    shared: { bytes: 120 * 1024, files: 5 },
    total: { bytes: 340 * 1024, files: 18 },
    routes: [{ route: "index", bytes: 180 * 1024, scripts: [] }],
    heavy: { three: { bytes: 134 * 1024, files: ["static/chunks/three.js"], inShared: false, routes: [] } },
  };
  const limits = { sharedKb: 150, firstLoadKb: 240, totalKb: 520 };

  it("deixa passar um build dentro do orçamento", () => {
    expect(evaluate(okResult, limits)).toEqual([]);
  });

  it("denuncia o three a entrar no bundle partilhado", () => {
    const polluted = { ...okResult, heavy: { three: { ...okResult.heavy.three, inShared: true } } };
    expect(evaluate(polluted, limits).join(" ")).toMatch(/three está no bundle partilhado/);
  });

  it("denuncia o three no primeiro pintado de uma rota", () => {
    const eager = {
      ...okResult,
      heavy: { three: { ...okResult.heavy.three, routes: ["app/projetos/mares-do-casal"] } },
    };
    expect(evaluate(eager, limits).join(" ")).toMatch(/deve ser diferido/);
  });

  it("mede o peso por rota e não só o total", () => {
    const heavy = { ...okResult, routes: [{ route: "app/projetos", bytes: 400 * 1024, scripts: [] }] };
    expect(evaluate(heavy, limits).join(" ")).toMatch(/first-load de \/app\/projetos em 400 kB/);
  });
});
