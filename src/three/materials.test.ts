import { describe, expect, it } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "./demo-building";
import {
  clampOffset,
  clampScale,
  EDIT_LIMITS,
  MATERIAL_IDS,
  MATERIALS,
  materialFor,
  stairSteps,
} from "./materials";
import { ELEMENT_CATEGORIES, type MaterialId } from "./model";

const document = buildDemoDocument(demoProjects[0]!);

describe("biblioteca de materiais", () => {
  it("cobre todas as categorias de elemento", () => {
    for (const category of ELEMENT_CATEGORIES) {
      expect(
        MATERIAL_IDS.some((id) => MATERIALS[id].category === category),
        category,
      ).toBe(true);
    }
  });

  it("aponta sempre para um token do sistema de design, com *fallback* legível", () => {
    for (const id of MATERIAL_IDS) {
      const params = MATERIALS[id];
      expect(params.colorToken.startsWith("--"), id).toBe(true);
      expect(params.fallbackColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(params.roughness).toBeGreaterThanOrEqual(0);
      expect(params.metalness).toBeLessThanOrEqual(1);
      if (params.opacity < 1) {
        expect(params.transparent, id).toBe(true);
      }
    }
  });

  it("cada elemento do documento resolve um material existente", () => {
    const seen = new Set<MaterialId>();
    for (const element of document.elements) {
      const params = materialFor(element);
      expect(params.id).toBe(element.materialId);
      seen.add(params.id);
    }
    // Materiais distintos por categoria: é o que faz o modelo ler-se como projeto e não como massa.
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it("limites de edição são os mesmos em qualquer caminho de escrita", () => {
    expect(clampOffset(0, 10_000)).toBe(EDIT_LIMITS.maxOffsetM);
    expect(clampOffset(0, -10_000)).toBe(-EDIT_LIMITS.maxOffsetM);
    expect(clampOffset(2, 2)).toBe(2);
    expect(clampScale(99)).toBe(EDIT_LIMITS.maxScale);
    expect(clampScale(0.01)).toBe(EDIT_LIMITS.minScale);
    // Três decimais = milímetro: é a resolução que o documento declara.
    expect(clampScale(1.00049)).toBe(1);
  });

  it("degraus de escada preenchem o volume subido", () => {
    const steps = stairSteps(1.2, 3, 2.8, 14);
    expect(steps).toHaveLength(14);
    const top = steps[steps.length - 1]!;
    expect(top.offset[1] + top.size[1] / 2).toBeCloseTo(2.8 / 2, 3);
    expect(top.offset[2] + top.size[2] / 2).toBeCloseTo(3 / 2, 3);
    const first = steps[0]!;
    expect(first.offset[2] - first.size[2] / 2).toBeCloseTo(-3 / 2, 3);
    expect(new Set(steps.map((step) => step.offset[1])).size).toBe(14);
  });

  it("limita o número de degraus gerados, seja o que for que o JSON disser", () => {
    expect(stairSteps(1, 3, 3, 9999)).toHaveLength(60);
    expect(stairSteps(1, 3, 3, 0)).toHaveLength(2);
    expect(stairSteps(1, 3, 3, Number.NaN)).toHaveLength(2);
  });
});
