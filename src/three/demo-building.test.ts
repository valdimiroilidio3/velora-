import { describe, expect, it } from "vitest";
import { DEMO_NOTICE, demoProjects } from "@/demo/projects";
import { buildMassing } from "@/demo/massing";
import { buildDemoDocument, MODEL_CONSTANTS } from "./demo-building";
import { categoryLabels, elementDimensions, elementMetrics, nominalSize, ELEMENT_CATEGORIES } from "./model";
import { checkPerformanceBudget, estimateDocumentMetrics, planQuality, TRIANGLES_PER_BOX } from "./metrics";
import { ancestorsOf, buildHierarchy, flattenTree, nodeForElement } from "./hierarchy";
import { ruleFor } from "./edit-rules";

const project = demoProjects[0]!;
const document = buildDemoDocument(project);

describe("documento gerado", () => {
  it("declara a convenção de unidades e o aviso de demonstração", () => {
    expect(document.convention).toBe("velora.meters.y-up.v1");
    expect(document.upAxis).toBe("Y");
    expect(document.northAxis).toBe("-Z");
    expect(document.origin).toContain("centroide");
    expect(document.notice).toBe(DEMO_NOTICE);
  });

  it("gera um edifício completo para os seis projetos de demonstração", () => {
    for (const item of demoProjects) {
      const doc = buildDemoDocument(item);
      const categories = new Set(doc.elements.map((element) => element.category));
      for (const required of [
        "terrain",
        "platform",
        "slab",
        "wall",
        "window",
        "door",
        "roof",
        "circulation",
      ]) {
        expect(categories.has(required as never), `${item.slug} sem ${required}`).toBe(true);
      }
      expect(doc.elements.length).toBeGreaterThan(80);
    }
  });

  it("os ids são únicos e legíveis por piso e categoria", () => {
    const ids = document.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/^(site|roof|L\d+)\.[a-z]+\.\d{2}$/);
  });

  it("cada elemento pertence a um piso declarado", () => {
    const levels = new Set(document.levels.map((level) => level.id));
    for (const element of document.elements) {
      expect(levels.has(element.levelId), element.id).toBe(true);
    }
    expect(document.levels.map((level) => level.id)).toContain("site");
    expect(document.levels.map((level) => level.id)).toContain("roof");
  });

  it("dois documentos do mesmo projeto são independentes", () => {
    const other = buildDemoDocument(project);
    expect(other.elements.length).toBe(document.elements.length);
    expect(other).not.toBe(document);
    // Ids prefixados isolam dois modelos no mesmo teste.
    const prefixed = buildDemoDocument(project, { idPrefix: "outro" });
    expect(prefixed.id).toBe("outro.doc");
  });
});

describe("coerência com a volumetria da Fase 2", () => {
  it("as lajes batem certo com os níveis do Massing", () => {
    const massing = buildMassing(project.scene);
    const slabs = document.elements.filter((element) => element.category === "slab");
    const boxes = massing.levels.reduce((total, level) => total + level.boxes.length, 0);
    expect(slabs.length).toBe(boxes);
    massing.levels.forEach((level, index) => {
      const levelId = `L${String(index + 1).padStart(2, "0")}`;
      const levelSlabs = slabs.filter((element) => element.levelId === levelId);
      expect(levelSlabs.length).toBe(level.boxes.length);
      for (const [boxIndex, box] of level.boxes.entries()) {
        const slab = levelSlabs[boxIndex];
        expect(slab).toBeDefined();
        const nominal = nominalSize(slab!.geometry);
        expect(nominal[0]).toBeCloseTo(box.widthM, 2);
        expect(nominal[2]).toBeCloseTo(box.depthM, 2);
        expect(slab!.transform.position[1]).toBeCloseTo(
          level.elevationM - MODEL_CONSTANTS.slabThicknessM / 2,
          3,
        );
      }
    });
  });

  it("a altura das paredes é o pé-direito menos a laje", () => {
    const walls = document.elements.filter((element) => element.category === "wall");
    const expected = project.scene.floorHeightM - MODEL_CONSTANTS.slabThicknessM;
    for (const wall of walls) {
      const size = nominalSize(wall.geometry);
      // Montantes/resguardos/lintéis são mais baixos; nenhum pode exceder o pé-direito útil.
      expect(size[1]).toBeLessThanOrEqual(expected + 0.001);
      expect(size[1]).toBeGreaterThan(0);
    }
    expect(walls.some((wall) => Math.abs(nominalSize(wall.geometry)[1] - expected) < 0.001)).toBe(true);
  });

  it("o topo do edifício coincide com a altura total da volumetria", () => {
    const massing = buildMassing(project.scene);
    const roofs = document.elements.filter((element) => element.category === "roof");
    const topmost = Math.max(...roofs.map((element) => elementMetrics(element).topElevationM));
    expect(topmost).toBeCloseTo(massing.totalHeightM + 0.3 + MODEL_CONSTANTS.parapetHeightM, 2);
  });

  it("os pisos seguem a ordem das cotas", () => {
    const building = document.levels.filter((level) => level.id.startsWith("L"));
    const elevations = building.map((level) => level.elevationM);
    expect(elevations).toEqual([...elevations].sort((a, b) => a - b));
  });
});

describe("unidades e dimensões", () => {
  it("1 m real = 1 unidade de mundo, e o terreno é maior que o edifício", () => {
    const terrain = document.elements.find((element) => element.category === "terrain")!;
    const [width] = elementDimensions(terrain);
    const maxExtent = Math.max(
      ...document.elements
        .filter((element) => element.category === "slab")
        .map((element) => elementMetrics(element).footprintM2),
    );
    expect(width * width).toBeGreaterThan(maxExtent);
    expect(width).toBeLessThan(200); // metros, não milímetros nem centímetros
  });

  it("as soleiras e as alturas de porta são as declaradas", () => {
    const windows = document.elements.filter((element) => element.category === "window");
    const door = document.elements.find((element) => element.category === "door")!;
    expect(nominalSize(windows[0]!.geometry)[1]).toBeCloseTo(MODEL_CONSTANTS.windowHeightM, 3);
    expect(door.transform.position[1]).toBeCloseTo(MODEL_CONSTANTS.doorHeightM / 2, 3);
  });

  it("terreno e plataforma são bloqueados; estrutura não escala", () => {
    for (const category of ["terrain", "platform"] as const) {
      const item = document.elements.find((element) => element.category === category)!;
      expect(item.locked, category).toBe(true);
      expect(ruleFor(category).move).toBe("none");
      expect(categoryLabels[category].length).toBeGreaterThan(3);
    }
    for (const wall of document.elements.filter((element) => element.category === "wall")) {
      expect(wall.structural).toBe(true);
    }
    for (const interior of document.elements.filter((element) => element.category === "interior")) {
      expect(interior.structural).toBe(false);
    }
  });

  it("toda a geometria está dentro das categorias declaradas", () => {
    for (const element of document.elements) {
      expect(ELEMENT_CATEGORIES).toContain(element.category);
    }
  });
});

describe("nível de detalhe e orçamento de render", () => {
  it("`compact` produz menos elementos e mantém as categorias estruturais", () => {
    const compact = buildDemoDocument(project, { detail: "compact" });
    expect(compact.elements.length).toBeLessThan(document.elements.length);
    const categories = new Set(compact.elements.map((element) => element.category));
    expect(categories.has("partition")).toBe(false);
    expect(categories.has("interior")).toBe(false);
    expect(categories.has("slab")).toBe(true);
    expect(categories.has("wall")).toBe(true);
  });

  it("a estimativa de render é contável e bate certo com as primitivas", () => {
    const estimate = estimateDocumentMetrics(document);
    const stairs = document.elements.filter((element) => element.geometry.kind === "stairs");
    const extraPrimitives = stairs.reduce(
      (total, element) => total + (element.geometry.kind === "stairs" ? element.geometry.steps - 1 : 0),
      0,
    );
    expect(estimate.primitives).toBe(estimate.elements + extraPrimitives);
    expect(estimate.triangles).toBe(estimate.primitives * TRIANGLES_PER_BOX);
    expect(estimate.materials).toBeLessThanOrEqual(10);
  });

  it("nenhum projeto de demonstração ultrapassa o orçamento de cena", () => {
    for (const item of demoProjects) {
      const estimate = estimateDocumentMetrics(buildDemoDocument(item));
      const check = checkPerformanceBudget(estimate);
      expect(check.violations, `${item.slug}: ${check.violations.join(", ")}`).toEqual([]);
    }
  });

  it("filtrar um piso reduz efetivamente o trabalho do GPU", () => {
    const full = estimateDocumentMetrics(document);
    const onlyLevel = {
      ...document,
      elements: document.elements.map((element) => ({ ...element, visible: element.levelId === "L01" })),
    };
    const filtered = estimateDocumentMetrics(onlyLevel);
    expect(filtered.elements).toBeLessThan(full.elements);
    expect(filtered.elements).toBeGreaterThan(0);
  });

  it("a planificação de qualidade degrada por ordem e diz o que fez", () => {
    const heavy = estimateDocumentMetrics(document);
    const desktop = planQuality({ estimate: heavy, constrained: false, reducedMotion: false });
    expect(desktop.detail).toBe("full");
    expect(desktop.shadows).toBe(true);
    const phone = planQuality({ estimate: heavy, constrained: true, reducedMotion: true });
    expect(phone.detail).toBe("compact");
    expect(phone.shadows).toBe(false);
    expect(phone.maxPixelRatio).toBe(1);
    expect(phone.steps.length).toBeGreaterThanOrEqual(3);
  });
});

describe("hierarquia", () => {
  it("tem as cinco camadas pedidas, por esta ordem", () => {
    const root = buildHierarchy(document);
    expect(root.kind).toBe("project");
    const building = root.children[0]!;
    expect(building.kind).toBe("building");
    const level = building.children[0]!;
    expect(level.kind).toBe("level");
    const category = level.children[0]!;
    expect(category.kind).toBe("category");
    expect(category.children[0]!.kind).toBe("element");
  });

  it("as contagens da árvora somam os elementos do documento", () => {
    const root = buildHierarchy(document);
    expect(root.count).toBe(document.elements.length);
    const levels = root.children[0]!.children;
    expect(levels.reduce((total, level) => total + level.count, 0)).toBe(document.elements.length);
  });

  it("só há nós de categoria com elementos", () => {
    const flat = flattenTree(buildHierarchy(document));
    const categoryNodes = flat.filter((entry) => entry.node.kind === "category");
    for (const entry of categoryNodes) {
      expect(entry.node.count).toBeGreaterThan(0);
    }
    expect(categoryNodes.length).toBeGreaterThan(4);
  });

  it("a seleção de um elemento é encontrada na árvore, com o caminho de expansão", () => {
    const root = buildHierarchy(document);
    const target = document.elements.find((element) => element.category === "window")!;
    const node = nodeForElement(root, target.id);
    expect(node?.label).toBe(target.name);
    const trail = ancestorsOf(root, target.id);
    expect(trail).toContain(`level:${target.levelId}`);
    expect(trail[0]).toBe(`project:${document.id}`);
    expect(ancestorsOf(root, null)).toEqual([]);
  });
});
