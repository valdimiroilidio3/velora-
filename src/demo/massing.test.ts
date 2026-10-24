import { describe, expect, it } from "vitest";
import { buildMassing, levelSummary, toPlanLevels } from "./massing";
import { DEMO_NOTICE, demoProjects, demoUser } from "./projects";

/**
 * A projeção de volumes é a única fonte das duas representações (SVG e WebGL).
 * Estes testes existem para que a coerência entre as duas seja uma garantia, não uma esperança.
 */
describe("buildMassing", () => {
  it("produz um piso por andar do seed, com elevações contíguas", () => {
    for (const project of demoProjects) {
      const massing = buildMassing(project.scene);
      expect(massing.levels).toHaveLength(project.scene.floors);
      massing.levels.forEach((level, index) => {
        expect(level.elevationM).toBeCloseTo(index * project.scene.floorHeightM, 3);
        expect(level.heightM).toBeCloseTo(project.scene.floorHeightM, 3);
      });
      expect(massing.totalHeightM).toBeCloseTo(project.scene.floors * project.scene.floorHeightM, 2);
    }
  });

  it("marca pódio e recuados e nunca os sobrepõe ao resto", () => {
    const project = demoProjects[0];
    if (project === undefined) throw new Error("sem projetos de demonstração");
    const massing = buildMassing(project.scene);
    const { podium, setback } = levelSummary(massing);
    expect(podium).toBe(Math.min(project.scene.podiumFloors, project.scene.floors));
    expect(setback).toBe(Math.min(project.scene.setbackFloors, project.scene.floors - podium));
    expect(podium + setback).toBeLessThanOrEqual(massing.levels.length);
    expect(massing.levels[0]?.kind).toBe(podium > 0 ? "podium" : "typical");
    expect(massing.levels.at(-1)?.kind).toBe(setback > 0 ? "setback" : "typical");
  });

  it("o pódio é contínuo: um único volume por piso de base", () => {
    for (const project of demoProjects) {
      const massing = buildMassing(project.scene);
      const podiumLevels = massing.levels.filter((level) => level.kind === "podium");
      for (const level of podiumLevels) {
        expect(level.boxes).toHaveLength(1);
      }
    }
  });

  it("recuado encolhe a área construída face ao piso típico", () => {
    const project = demoProjects.find((item) => item.scene.setbackFloors > 0) ?? demoProjects[0];
    if (project === undefined) throw new Error("sem projetos de demonstração");
    const massing = buildMassing(project.scene);
    const typical = massing.levels.find((level) => level.kind === "typical");
    const setback = massing.levels.find((level) => level.kind === "setback");
    if (typical === undefined || setback === undefined) {
      throw new Error("seed sem piso típico ou recuado");
    }
    const areaOf = (boxes: readonly { widthM: number; depthM: number }[]) =>
      boxes.reduce((total, box) => total + box.widthM * box.depthM, 0);
    expect(areaOf(setback.boxes)).toBeLessThan(areaOf(typical.boxes));
  });

  it("é determinística: a mesma seed produz o mesmo objeto", () => {
    const project = demoProjects[2] ?? demoProjects[0];
    if (project === undefined) throw new Error("sem projetos de demonstração");
    expect(buildMassing(project.scene)).toEqual(buildMassing(project.scene));
  });
});

describe("toPlanLevels", () => {
  it("mantém o mesmo número de contornos por piso que a projeção 3D", () => {
    for (const project of demoProjects) {
      const massing = buildMassing(project.scene);
      const plan = toPlanLevels(massing);
      expect(plan).toHaveLength(massing.levels.length);
      massing.levels.forEach((level, index) => {
        const planLevel = plan[index];
        expect(planLevel?.rects).toHaveLength(level.boxes.length);
        expect(planLevel?.kind).toBe(level.kind);
      });
    }
  });

  it("converte centro em canto sem perder dimensão", () => {
    const project = demoProjects[0];
    if (project === undefined) throw new Error("sem projetos de demonstração");
    const massing = buildMassing(project.scene);
    const source = massing.levels.at(-1)?.boxes[0];
    const rect = toPlanLevels(massing).at(-1)?.rects[0];
    if (source === undefined || rect === undefined) throw new Error("piso sem volumes");
    expect(rect.x).toBeCloseTo(source.cx - source.widthM / 2, 3);
    expect(rect.y).toBeCloseTo(source.cz - source.depthM / 2, 3);
    expect(rect.width).toBe(source.widthM);
    expect(rect.depth).toBe(source.depthM);
  });

  it("o lote cresce com a implantação, nunca fica menor que o edifício", () => {
    for (const project of demoProjects) {
      const massing = buildMassing(project.scene);
      const half = Math.max(
        ...massing.levels.flatMap((level) =>
          level.boxes.map((box) =>
            Math.max(Math.abs(box.cx) + box.widthM / 2, Math.abs(box.cz) + box.depthM / 2),
          ),
        ),
      );
      expect(massing.siteRadiusM).toBeGreaterThanOrEqual(half);
    }
  });
});

describe("contrato de demonstração", () => {
  it("todos os registos estão marcados como demonstração", () => {
    expect(demoProjects.length).toBe(6);
    for (const project of demoProjects) {
      expect(project.isDemo).toBe(true);
      expect(project.code).toMatch(/^DEMO-\d{2}$/);
      expect(project.slug).toMatch(/^[a-z0-9-]+$/); // sem caracteres acentuados em URLs
    }
  });

  it("o aviso de demonstração existe e é legível", () => {
    expect(DEMO_NOTICE.length).toBeGreaterThan(40);
    expect(DEMO_NOTICE.toLowerCase()).toContain("demonstr");
  });

  it("nenhum registo contém contacto, credencial ou dado que pareça real", () => {
    // Repo público: o custo de escrever isto é uma linha; o de publicar um dado real é irreversível.
    const serialized = JSON.stringify({ projects: demoProjects, user: demoUser });
    expect(serialized).not.toMatch(/\+?351\s?\d{3}\s?\d{3}\s?\d{3}/);
    expect(serialized).not.toMatch(/(password|passwd|token|secret|api[_-]?key)\s*[:=]/i);
    // E-mail só é aceite nos TLD reservados para documentação (RFC 2606): `.invalid`,
    // `.example`, `.test`. Qualquer outro domínio pode pertencer a uma pessoa real.
    const emails = serialized.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/g) ?? [];
    expect(emails.length).toBeGreaterThan(0);
    for (const email of emails) {
      expect(email).toMatch(/\.(invalid|example|test)$/);
    }
  });
});
