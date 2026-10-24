import { describe, expect, it, vi } from "vitest";
import { demoProjects } from "@/demo/projects";
import { categoryLabels, type SceneDocument } from "@/three/model";
import {
  createEditorStore,
  categoryVisibility,
  isCategoryVisible,
  planFor,
  selectedElements,
} from "./editor-store";

const project = demoProjects[0]!;

function makeStore() {
  return createEditorStore({ project });
}

const wallOf = (document: SceneDocument) => document.elements.find((element) => element.category === "wall")!;

describe("store do editor", () => {
  it("nasce com o documento gerado, sem seleção e em modo selecionar", () => {
    const state = makeStore().getState();
    expect(state.sourceSlug).toBe(project.slug);
    expect(state.selection).toEqual([]);
    expect(state.tool).toBe("selecionar");
    expect(state.edits).toBe(0);
    expect(state.document.elements.length).toBeGreaterThan(80);
  });

  it("o snapshot é estável entre leituras e muda só quando se escreve", () => {
    const store = makeStore();
    const first = store.getState();
    expect(store.getState()).toBe(first);
    const wall = wallOf(first.document);
    store.select(wall.id);
    expect(store.getState()).not.toBe(first);
    // Re-selecionar o mesmo elemento não produz um novo estado (nem um re-render da árvore).
    const second = store.getState();
    store.select(wall.id);
    expect(store.getState()).toBe(second);
  });

  it("notifica os subscritores e para de o fazer depois do unsubscribe", () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.select(wallOf(store.getState().document).id);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    store.select(null);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("Shift acumula e volta a clicar remove", () => {
    const store = makeStore();
    const [a, b] = store.getState().document.elements.filter((element) => element.category === "partition");
    store.select(a!.id);
    store.select(b!.id, true);
    expect(store.getState().selection).toEqual([a!.id, b!.id]);
    // Seleção múltipla não tem gizmo: a ferramenta volta a "selecionar".
    expect(store.getState().tool).toBe("selecionar");
    store.select(a!.id, true);
    expect(store.getState().selection).toEqual([b!.id]);
    store.select(null);
    expect(store.getState().selection).toEqual([]);
  });

  it("recusa uma ferramenta sem um único elemento, com motivo legível", () => {
    const store = makeStore();
    store.setTool("translate");
    expect(store.getState().tool).toBe("selecionar");
    expect(store.getState().rejected.join(" ")).toContain("único elemento");
    const wall = wallOf(store.getState().document);
    store.select(wall.id);
    store.setTool("translate");
    expect(store.getState().tool).toBe("translate");
  });

  it("aplica uma tradução de parede com o passo de 0,1 m do motor", () => {
    const store = makeStore();
    const wall = wallOf(store.getState().document);
    const [x, y, z] = wall.transform.position;
    const ok = store.applyTransform(wall.id, { position: [x + 1.24, y, z] });
    expect(ok).toBe(true);
    const next = wallOf(store.getState().document);
    // O passo é uma grelha absoluta do documento: -16,947 + 1,24 = -15,707 → -15,7.
    expect(next.transform.position[0]).toBe(Math.round((x + 1.24) * 10) / 10);
    expect(next.transform.position[1]).toBe(y);
    expect(store.getState().edits).toBe(1);
  });

  it("não conta uma edição que a regra recusou", () => {
    const store = makeStore();
    const terrain = store.getState().document.elements.find((element) => element.category === "terrain")!;
    const before = store.getState().document;
    const ok = store.applyTransform(terrain.id, { position: [terrain.transform.position[0] + 3, 1, 0] });
    expect(ok).toBe(false);
    expect(store.getState().document).toBe(before);
    expect(store.getState().edits).toBe(0);
    expect(store.getState().rejected.length).toBeGreaterThan(0);
  });

  it("aplicação parcial mantém o motivo visível", () => {
    const store = makeStore();
    const wall = wallOf(store.getState().document);
    // Parede de fachada: move-se e roda, mas não escala ⇒ `scale` é recusado, o resto aplica-se.
    const ok = store.applyTransform(wall.id, {
      position: [wall.transform.position[0] + 0.5, wall.transform.position[1], wall.transform.position[2]],
      scale: [2, 2, 2],
    });
    expect(ok).toBe(true);
    expect(store.getState().rejected).toContain("escala");
    expect(store.getState().edits).toBe(1);
  });

  it("esconde e mostra por elemento e por categoria, sempre no documento", () => {
    const store = makeStore();
    const wall = wallOf(store.getState().document);
    store.setElementVisibility(wall.id, false);
    expect(store.getState().document.elements.find((element) => element.id === wall.id)?.visible).toBe(false);
    expect(planFor(store.getState()).elements.some((element) => element.elementId === wall.id)).toBe(false);

    store.setCategoryVisibility("window", false);
    const visibility = categoryVisibility(store.getState().document);
    expect(visibility.window?.visible).toBe(0);
    expect(isCategoryVisible(store.getState(), "window")).toBe(false);
    store.setCategoryVisibility("window", true);
    expect(isCategoryVisible(store.getState(), "window")).toBe(true);
  });

  it("as seleções lidas para o painel são as do documento atual", () => {
    const store = makeStore();
    const wall = wallOf(store.getState().document);
    store.select(wall.id);
    store.applyTransform(wall.id, {
      position: [wall.transform.position[0] + 2, wall.transform.position[1], wall.transform.position[2]],
    });
    const [current] = selectedElements(store.getState());
    expect(current?.id).toBe(wall.id);
    expect(current?.transform.position[0]).not.toBe(wall.transform.position[0]);
    expect(categoryLabels[current!.category]).toBe("Paredes exteriores");
  });

  it("comandos de câmera têm um nonce novo por pedido, mesmo repetido", () => {
    const store = makeStore();
    store.requestView({ kind: "preset", preset: "superior" });
    const first = store.getState().viewCommand;
    store.requestView({ kind: "preset", preset: "superior" });
    const second = store.getState().viewCommand;
    expect(first?.nonce).not.toBe(second?.nonce);
    expect(second?.command).toEqual({ kind: "preset", preset: "superior" });
  });

  it("trocar de projeto limpa seleção, edições e ferramentas", () => {
    const store = makeStore();
    const wall = wallOf(store.getState().document);
    store.select(wall.id);
    store.setTool("translate");
    store.applyTransform(wall.id, {
      position: [wall.transform.position[0] + 1, wall.transform.position[1], wall.transform.position[2]],
    });
    const other = demoProjects[1]!;
    store.load(other);
    const state = store.getState();
    expect(state.sourceSlug).toBe(other.slug);
    expect(state.selection).toEqual([]);
    expect(state.tool).toBe("selecionar");
    expect(state.edits).toBe(0);
    expect(state.viewCommand?.command).toEqual({ kind: "reset" });
  });

  it("o reset volta ao documento gerado, sem estado residual de edição", () => {
    const store = makeStore();
    const original = store.getState().document;
    const wall = wallOf(original);
    store.setElementVisibility(wall.id, false);
    store.reset();
    expect(store.getState().document).not.toBe(original);
    expect(store.getState().document.elements.map((element) => element.id)).toEqual(
      original.elements.map((element) => element.id),
    );
    expect(store.getState().document.elements.find((element) => element.id === wall.id)?.visible).toBe(true);
  });
});
