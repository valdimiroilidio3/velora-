import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "../demo-building";
import { withVisibility } from "../model";
import { buildRenderPlan } from "../render-plan";
import { MATERIALS } from "../materials";
import { createMaterialRegistry } from "./materials";
import { createSceneManager, type RendererLike } from "./scene-manager";

/**
 * Testas de ciclo de vida do palco, em jsdom, **sem GPU**: o `renderer` é injetado, por isso o que
 * está em causa é o que o nosso código faz aos objetos de CPU — criar geometrias, reaproveitá-las,
 * realçar, e libertar tudo. O que desenho no ecrã é outra história e vive em `docs/MANUAL-3D-TESTS.md`.
 */

const TOKENS: Record<string, string> = {
  "--canvas": "#f6f4f0",
  "--surface": "#fffefb",
  "--line": "#dcd8d0",
  "--line-strong": "#b9b4aa",
  "--line-control": "#7b8087",
  "--accent": "#0f4f47",
  "--scene-ground": "#d8d4cb",
  "--scene-line": "#c8c3b8",
  "--scene-mass": "#cfcabf",
  "--scene-mass-lit": "#e2ded6",
  "--scene-glazing": "#6f7f80",
};
const readToken = (name: string) => TOKENS[name] ?? null;

function makeRenderer() {
  const renderer: RendererLike = {
    domElement: document.createElement("canvas"),
    shadowMap: { enabled: false, type: THREE.BasicShadowMap, needsUpdate: false },
    info: { render: { calls: 0, triangles: 0, frame: 0 }, memory: { geometries: 0, textures: 0 } },
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  };
  return renderer;
}

const project = demoProjects[0]!;
const document_ = buildDemoDocument(project);

function makeManager(options: { shadows?: boolean } = {}) {
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  container.append(canvas);
  const renderer = makeRenderer();
  const manager = createSceneManager({
    canvas,
    container,
    readToken,
    shadows: options.shadows ?? true,
    maxPixelRatio: 2,
    antialias: true,
    createRenderer: () => renderer,
  });
  return { manager, renderer, canvas, container };
}

describe("sincronização cena ⇄ documento", () => {
  it("cria um grupo por elemento, com o id do documento em cada malha", () => {
    const { manager } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const wall = plan.elements.find((element) => element.category === "wall")!;
    const group = manager.objectFor(wall.elementId);
    expect(group).toBeDefined();
    expect(group?.userData.elementId).toBe(wall.elementId);
    for (const mesh of group?.children ?? []) {
      expect((mesh as THREE.Mesh).userData.elementId).toBe(wall.elementId);
    }
    expect(manager.stats().meshes).toBe(plan.primitiveCount);
    manager.dispose();
  });

  it("esconde ao retirar o grupo, sem tocar nos outros", () => {
    const { manager } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const target = document_.elements.find((element) => element.category === "interior")!;
    const before = manager.stats().meshes;
    manager.sync(buildRenderPlan(withVisibility(document_, target.id, false)));
    expect(manager.objectFor(target.id)).toBeUndefined();
    expect(manager.stats().meshes).toBeLessThan(before);
    manager.dispose();
  });

  it("arrastar um elemento não reconstrói geometria", () => {
    const { manager } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const wall = document_.elements.find((element) => element.category === "wall")!;
    const group = manager.objectFor(wall.id)!;
    const mesh = group.children[0] as THREE.Mesh;
    const geometry = mesh.geometry;
    manager.sync(
      buildRenderPlan(
        withTransformedDocument(wall.id, {
          ...wall.transform,
          position: [
            wall.transform.position[0] + 1.2,
            wall.transform.position[1],
            wall.transform.position[2],
          ],
        }),
      ),
    );
    // Mesma instância de geometria: é isto que torna o arrasto barato.
    expect((manager.objectFor(wall.id)!.children[0] as THREE.Mesh).geometry).toBe(geometry);
    expect(manager.objectFor(wall.id)!.position.x).toBeCloseTo(wall.transform.position[0] + 1.2, 3);
    manager.dispose();
  });

  it("material diferente força a reconstrução e liberta a geometria antiga", () => {
    const { manager } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const wall = document_.elements.find((element) => element.category === "wall")!;
    const mesh = manager.objectFor(wall.id)!.children[0] as THREE.Mesh;
    const disposeSpy = vi.spyOn(mesh.geometry, "dispose");
    const nextDoc = {
      ...document_,
      elements: document_.elements.map((element) =>
        element.id === wall.id ? { ...element, materialId: "glazing" as const } : element,
      ),
    };
    manager.sync(buildRenderPlan(nextDoc));
    expect(disposeSpy).toHaveBeenCalledOnce();
    manager.dispose();
  });

  it("a escala vai para o objeto e não para a geometria", () => {
    const { manager } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const slab = plan.elements.find((element) => element.category === "slab")!;
    const group = manager.objectFor(slab.elementId)!;
    expect(group.scale.toArray()).toEqual(slab.transform.scale);
    expect(group.rotation.y).toBeCloseTo((slab.transform.rotationYDeg * Math.PI) / 180, 6);
    manager.dispose();
  });
});

function withTransformedDocument(
  id: string,
  transform: {
    position: readonly [number, number, number];
    rotationYDeg: number;
    scale: readonly [number, number, number];
  },
) {
  return {
    ...document_,
    elements: document_.elements.map((element) => (element.id === id ? { ...element, transform } : element)),
  };
}

describe("realce, tema e libertação", () => {
  it("realça os dois objetos ao mesmo tempo e limpa os contornos quando diz que não há seleção", () => {
    const { manager } = makeManager();
    manager.sync(buildRenderPlan(document_));
    const ids = document_.elements
      .filter((element) => element.category === "partition")
      .slice(0, 2)
      .map((element) => element.id);
    const groups = ids.map((id) => manager.objectFor(id)!);
    const count = () =>
      manager.root.children.reduce((total, child) => {
        let found = 0;
        child.traverse((node) => {
          if (node.name === "velora.highlight") {
            found += 1;
          }
        });
        return total + found;
      }, 0);
    const before = count();
    manager.registry.setHighlights([
      { object: groups[0]!, mode: "selected" },
      { object: groups[1]!, mode: "hover" },
    ]);
    // Dois elementos, dois realces: foi precisamente nisto que uma API por objeto falhou.
    expect(count()).toBe(before + 2);
    manager.registry.setHighlights([
      { object: groups[0]!, mode: "selected" },
      { object: groups[1]!, mode: "hover" },
    ]);
    expect(count()).toBe(before + 2);
    manager.registry.setHighlights([]);
    expect(count()).toBe(before);
    manager.dispose();
  });

  it("o registo de materiais é partilhado por categoria, não por elemento", () => {
    const registry = createMaterialRegistry({ readToken });
    const plan = buildRenderPlan(document_);
    for (const element of plan.elements) {
      registry.acquire(element.materialId);
    }
    expect(registry.size()).toBeLessThan(plan.elements.length);
    const first = registry.acquire("wall");
    expect(registry.acquire("wall")).toBe(first);
    registry.dispose();
    expect(registry.size()).toBe(0);
  });

  it("mudar de tema relê os tokens sem recriar materiais", () => {
    const { manager } = makeManager();
    manager.sync(buildRenderPlan(document_));
    // O nome do token lê-se na biblioteca de materiais: se o mapeamento mudar, este teste avisa.
    const token = MATERIALS.slab.colorToken;
    const material = manager.registry.acquire("slab");
    const before = material.color.getHexString();
    TOKENS[token] = "#20303c";
    manager.refreshTheme();
    expect(material.color.getHexString()).not.toBe(before);
    expect(manager.registry.acquire("slab")).toBe(material);
    delete TOKENS[token];
    manager.dispose();
  });

  it("dispose liberta geometrias, remove do cenário e torna o objeto inerte", () => {
    const { manager, renderer } = makeManager();
    const plan = buildRenderPlan(document_);
    manager.sync(plan);
    const groups = [...manager.root.children];
    const meshes = groups.filter((child) => (child as THREE.Mesh).isMesh);
    const spies = meshes.slice(0, 5).map((mesh) => vi.spyOn((mesh as THREE.Mesh).geometry, "dispose"));
    manager.dispose();
    for (const spy of spies) {
      expect(spy).toHaveBeenCalledOnce();
    }
    expect(manager.root.children).toHaveLength(0);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    const before = manager.stats().meshes;
    manager.sync(plan); // depois do `dispose` não há mais trabalho nenhum
    expect(manager.stats().meshes).toBe(before);
    manager.dispose();
  });

  it("perde o contexto WebGL sem rebentar e avisa quem ouve", () => {
    const onContextLost = vi.fn();
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    container.append(canvas);
    const manager = createSceneManager({
      canvas,
      container,
      readToken,
      shadows: false,
      maxPixelRatio: 1,
      antialias: false,
      createRenderer: makeRenderer,
      onContextLost,
    });
    manager.sync(buildRenderPlan(document_));
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onContextLost).toHaveBeenCalledOnce();
    manager.dispose();
  });

  it("o `render()` delega no renderer com a câmera certa", () => {
    const { manager, renderer } = makeManager();
    manager.render();
    expect(renderer.render).toHaveBeenCalledWith(manager.scene, manager.camera);
    manager.dispose();
  });
});
