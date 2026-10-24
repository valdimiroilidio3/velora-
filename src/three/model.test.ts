import { describe, expect, it } from "vitest";
import {
  documentBounds,
  elementById,
  elementDimensions,
  elementMetrics,
  describeElement,
  nominalSize,
  withCategoryVisibility,
  withTransform,
  withVisibility,
  type SceneDocument,
  type SceneElement,
} from "./model";
import { canRotate, canScale, ruleFor, scaleAxes, toolsFor } from "./edit-rules";
import { areaLabel, degToRad, dimensionLabel, levelLabel, mm, normalizeDegrees, radToDeg } from "./units";

function element(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    id: "L01.wall.01",
    name: "Parede norte",
    category: "wall",
    levelId: "L01",
    materialId: "wall",
    geometry: { kind: "wall", lengthM: 12, heightM: 2.77, thicknessM: 0.25 },
    transform: { position: [0, 1.385, -6.75], rotationYDeg: 0, scale: [1, 1, 1] },
    visible: true,
    locked: false,
    structural: true,
    demo: { generatedFrom: "teste", note: "teste" },
    ...overrides,
  };
}

function document(elements: readonly SceneElement[]): SceneDocument {
  return {
    schemaVersion: 1,
    id: "doc.teste",
    name: "Documento de teste",
    convention: "velora.meters.y-up.v1",
    northAxis: "-Z",
    upAxis: "Y",
    origin: "origem de teste",
    orientationDeg: 0,
    levels: [{ id: "L01", index: 0, label: "Piso 1", kind: "typical", elevationM: 0, heightM: 3.05 }],
    elements,
    notice: "conteúdo de demonstração",
  };
}

describe("unidades", () => {
  it("graus e radianos convertem em círculo fechado", () => {
    expect(radToDeg(degToRad(90))).toBeCloseTo(90, 9);
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
  });

  it("o arredondamento é ao milímetro", () => {
    expect(mm(1.23456)).toBe(1.235);
    expect(mm(0.00004)).toBe(0);
  });

  it("as etiquetas usam vírgula decimal e unidades", () => {
    expect(dimensionLabel([6.2, 2.8, 0.25])).toBe("6,20 × 2,80 × 0,25 m");
    expect(levelLabel(3)).toBe("+3,000 m");
    expect(levelLabel(-1.5)).toBe("−1,500 m");
    expect(areaLabel(12.345)).toBe("12,35 m²");
  });
});

describe("geometria e dimensões", () => {
  it("cada espécie de geometria tem tamanho nominal", () => {
    expect(nominalSize({ kind: "box", size: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(nominalSize({ kind: "wall", lengthM: 4, heightM: 2.7, thicknessM: 0.25 })).toEqual([4, 2.7, 0.25]);
    expect(nominalSize({ kind: "plate", widthM: 10, depthM: 8, thicknessM: 0.28 })).toEqual([10, 0.28, 8]);
    expect(nominalSize({ kind: "panel", widthM: 1.2, heightM: 1.35, thicknessM: 0.06 })).toEqual([
      1.2, 1.35, 0.06,
    ]);
    const stairs = nominalSize({ kind: "stairs", widthM: 1.2, runM: 3, riseM: 2.77, steps: 15 });
    expect(stairs).toEqual([1.2, 2.77, 3]);
  });

  it("a escala multiplica o nominal, e é isso que o painel mostra", () => {
    const scaled = element({ transform: { position: [0, 0, 0], rotationYDeg: 0, scale: [2, 1, 0.5] } });
    expect(elementDimensions(scaled)).toEqual([24, 2.77, 0.125]);
  });

  it("paredes reportam área de alçado e lajes reportam área horizontal", () => {
    const wall = element();
    expect(elementMetrics(wall).footprintM2).toBeCloseTo(12 * 2.77, 2);
    const slab = element({
      category: "slab",
      structural: false,
      geometry: { kind: "plate", widthM: 10, depthM: 8, thicknessM: 0.28 },
    });
    expect(elementMetrics(slab).footprintM2).toBeCloseTo(80, 6);
    expect(elementMetrics(slab).volumeM3).toBeCloseTo(80 * 0.28, 4);
  });

  it("o painel de propriedades tem as chaves todas, com unidades", () => {
    const rows = describeElement(element()).map((row) => row.label);
    expect(rows).toEqual([
      "Identificador",
      "Categoria",
      "Piso",
      "Geometria",
      "Dimensões",
      "Posição",
      "Rotação",
      "Cota do topo",
      "Área de projeção",
      "Volume",
      "Material",
      "Estado",
    ]);
  });
});

describe("regras de edição", () => {
  it("paredes de fachada estruturais não escalam", () => {
    const wall = element();
    expect(canScale(wall).allowed).toBe(false);
    expect(canScale(wall).reason).toBeTruthy();
    expect(scaleAxes(wall)).toEqual([]);
  });

  it("divisórias escalam só em espessura", () => {
    const partition = element({ category: "partition", structural: false, materialId: "partition" });
    expect(canScale(partition).allowed).toBe(true);
    expect(scaleAxes(partition)).toEqual(["z"]);
  });

  it("lajes movem-se no vertical e escalam a espessura", () => {
    const slab = element({
      category: "slab",
      structural: true,
      geometry: { kind: "plate", widthM: 10, depthM: 8, thicknessM: 0.28 },
    });
    expect(ruleFor("slab").move).toBe("vertical");
    expect(scaleAxes(slab)).toEqual(["y"]);
    expect(canRotate(slab).allowed).toBe(false);
  });

  it("terreno e plataforma estão bloqueados", () => {
    expect(toolsFor(element({ category: "terrain", locked: true }))).toEqual(["select"]);
    expect(toolsFor(undefined)).toEqual(["select"]);
  });

  it("interior tem liberdade total", () => {
    const furniture = element({ category: "interior", structural: false, materialId: "furniture" });
    expect(toolsFor(furniture)).toEqual(["select", "move", "rotate", "scale"]);
  });

  it("a escrita passa pelas regras: eixo recusado não muda, e é reportado", () => {
    const base = document([element()]);
    const result = withTransform(base, "L01.wall.01", { position: [3, 5, -6.74] });
    // Parede: `planar` → X e Z aceitam-se (com passo de 10 cm); Y é recusado e reportado.
    expect(result.document.elements[0]?.transform.position).toEqual([3, 1.385, -6.7]);
    expect(result.rejected).toEqual(["Y"]);
    expect(result.applied).toBe(true);
    const rotated = withTransform(base, "L01.wall.01", { rotationYDeg: 12 });
    // Parede roda em passos de 5°: 12 → 10 (o mais próximo), 13 → 15.
    expect(rotated.document.elements[0]?.transform.rotationYDeg).toBe(10);
    const rotatedUp = withTransform(base, "L01.wall.01", { rotationYDeg: 13 });
    expect(rotatedUp.document.elements[0]?.transform.rotationYDeg).toBe(15);
    const scaled = withTransform(base, "L01.wall.01", { scale: [2, 2, 2] });
    expect(scaled.document.elements[0]?.transform.scale).toEqual([1, 1, 1]);
  });

  it("elemento bloqueado não aceita escrita nenhuma", () => {
    const base = document([element({ category: "terrain", locked: true, id: "site.terrain.01" })]);
    const result = withTransform(base, "site.terrain.01", { position: [1, 1, 1] });
    expect(result.applied).toBe(false);
    expect(result.document.elements[0]?.transform.position).toEqual([0, 1.385, -6.75]);
  });

  it("comandos de recusa vêm do próprio resolvedor, não da UI", async () => {
    const { resolveTransform } = await import("./edit-rules");
    const wall = element();
    const allowed = resolveTransform(wall, { position: [2, 0, 0] });
    expect(allowed.rejected).toEqual(["Y"]);
    const denied = resolveTransform(wall, { rotationYDeg: 30, scale: [2, 2, 2] });
    expect(denied.rejected).toContain("escala");
    expect(denied.transform.rotationYDeg).toBe(30);
  });
});

describe("seleção, visibilidade e limites", () => {
  it("procura por id estável", () => {
    const base = document([element(), element({ id: "L01.slab.01", category: "slab" })]);
    expect(elementById(base, "L01.slab.01")?.category).toBe("slab");
    expect(elementById(base, null)).toBeUndefined();
    expect(elementById(base, "não-existe")).toBeUndefined();
  });

  it("alternar visibilidade por categoria respeita o filtro de piso", () => {
    const base = document([
      element({ id: "L01.wall.01" }),
      element({ id: "L01.wall.02" }),
      element({ id: "L02.wall.01", levelId: "L02" }),
    ]);
    const hidden = withCategoryVisibility(base, "wall", false, "L01");
    expect(hidden.elements.map((item) => item.visible)).toEqual([false, false, true]);
    const all = withCategoryVisibility(base, "wall", false);
    expect(all.elements.every((item) => !item.visible)).toBe(true);
  });

  it("um elemento oculto não conta para o enquadramento", () => {
    const near = element({
      id: "L01.wall.01",
      transform: { position: [0, 0, 0], rotationYDeg: 0, scale: [1, 1, 1] },
    });
    const far = element({
      id: "L01.interior.01",
      category: "interior",
      levelId: "L01",
      transform: { position: [400, 0, 0], rotationYDeg: 0, scale: [1, 1, 1] },
    });
    const base = document([near, far]);
    expect(documentBounds(base).max[0]).toBeGreaterThan(400);
    const withoutFar = withVisibility(base, "L01.interior.01", false);
    expect(documentBounds(withoutFar).max[0]).toBeLessThan(50);
    expect(documentBounds(withoutFar, false).max[0]).toBeGreaterThan(400);
  });

  it("documento vazio tem raio positivo (o enquadramento não pode dividir por zero)", () => {
    const empty = document([]);
    const bounds = documentBounds(empty);
    expect(bounds.radius).toBeGreaterThan(0);
    expect(Number.isFinite(bounds.center[0])).toBe(true);
  });
});
