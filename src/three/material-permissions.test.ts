import { describe, expect, it } from "vitest";
import { demoProjects } from "@/demo/projects";
import {
  allowedMaterialsFor,
  canWear,
  MATERIAL_IDS,
  MATERIAL_PERMISSIONS,
  MATERIALS,
  materialRefusalReason,
} from "./materials";
import { buildDemoDocument } from "./demo-building";
import { elementById, withMaterial } from "./model";

const document = buildDemoDocument(demoProjects[0]!);
const firstOf = (category: string) => document.elements.find((element) => element.category === category)!;

describe("matriz de acabamentos", () => {
  it("cobre as dez categorias e só usa materiais que existem", () => {
    expect(Object.keys(MATERIAL_PERMISSIONS)).toHaveLength(10);
    for (const allowed of Object.values(MATERIAL_PERMISSIONS)) {
      for (const id of allowed) {
        expect(MATERIAL_IDS).toContain(id);
        expect(MATERIALS[id]).toBeDefined();
      }
    }
  });

  it("terreno e plataforma não aceitam acabamento nenhum, e dizem porquê", () => {
    expect(allowedMaterialsFor("terrain")).toEqual([]);
    expect(allowedMaterialsFor("platform")).toEqual([]);
    expect(materialRefusalReason("terrain")).toContain("plano de referência");
  });

  it("a fachada pode virar envidraçada e o interior pode vestir madeira", () => {
    expect(canWear("glazing", "wall")).toBe(true);
    expect(canWear("furniture", "wall")).toBe(false);
    expect(canWear("door", "interior")).toBe(true);
    expect(canWear("glazing", "slab")).toBe(false);
  });

  it("o acabamento por omissão de cada categoria continua permitido", () => {
    for (const element of document.elements) {
      const allowed = MATERIAL_PERMISSIONS[element.category];
      if (element.locked) {
        expect(allowed).toEqual([]);
        continue;
      }
      expect(allowed, element.id).toContain(element.materialId);
    }
  });
});

describe("withMaterial", () => {
  it("escreve no documento e não toca na geometria nem na seleção", () => {
    const wall = firstOf("wall");
    const result = withMaterial(document, wall.id, "glazing");
    expect(result.applied).toBe(true);
    expect(result.rejected).toEqual([]);
    const next = elementById(result.document, wall.id)!;
    expect(next.materialId).toBe("glazing");
    expect(next.geometry).toEqual(wall.geometry);
    expect(next.transform).toEqual(wall.transform);
    expect(next.name).toBe(wall.name);
    expect(result.document.elements).toHaveLength(document.elements.length);
  });

  it("recusa o terreno com o motivo da regra, sem produzir documento novo", () => {
    const terrain = firstOf("terrain");
    const result = withMaterial(document, terrain.id, "slab");
    expect(result.applied).toBe(false);
    expect(result.rejected.length).toBe(1);
    expect(result.document).toBe(document);
  });

  it("recusa um material incompatível com a categoria", () => {
    const slab = firstOf("slab");
    const result = withMaterial(document, slab.id, "glazing");
    expect(result.applied).toBe(false);
    expect(result.rejected[0]).toContain("não se aplica a lajes");
  });

  it("não conta como edição o repetir o acabamento que já lá está", () => {
    const wall = firstOf("wall");
    const result = withMaterial(document, wall.id, wall.materialId);
    expect(result.applied).toBe(false);
    expect(result.rejected).toEqual([]);
    expect(result.document).toBe(document);
  });

  it("desconhecido não rebenta: devolve recusa", () => {
    const result = withMaterial(document, "NAO.EXISTE.99", "wall");
    expect(result.applied).toBe(false);
    expect(result.rejected).toEqual(["elemento inexistente"]);
  });

  it("o resultado sobrevive à serialização (o campo é do documento, não da cena)", async () => {
    const { serializeSceneDocument, parseSceneDocument } = await import("./serialize");
    const wall = firstOf("wall");
    const next = withMaterial(document, wall.id, "glazing").document;
    const parsed = parseSceneDocument(serializeSceneDocument(next));
    expect(elementById(parsed, wall.id)!.materialId).toBe("glazing");
  });
});
