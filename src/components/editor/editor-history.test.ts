import { describe, expect, it } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "@/three/demo-building";
import { elementById } from "@/three/model";
import { LIGHTING_PRESETS } from "@/three/lighting-presets";
import { createEditorStore, HISTORY_LIMIT } from "./editor-store";

const project = demoProjects[0]!;

function store() {
  return createEditorStore({ project, document: buildDemoDocument(project) });
}

function firstOf(category: string): string {
  return buildDemoDocument(project).elements.find((element) => element.category === category)!.id;
}

describe("histórico do editor", () => {
  it("começa vazio e os botões não se podem clicar sobre nada", () => {
    const hub = store();
    expect(hub.getState().canUndo).toBe(false);
    expect(hub.getState().canRedo).toBe(false);
    expect(hub.undo()).toBe(false);
    expect(hub.redo()).toBe(false);
  });

  it("anular uma mudança de posição devolve o documento exato de antes", () => {
    const hub = store();
    const id = firstOf("wall");
    const before = hub.getState().document;
    expect(hub.applyTransform(id, { position: [0, 0, 5] })).toBe(true);
    expect(hub.getState().document).not.toBe(before);
    expect(hub.undo()).toBe(true);
    expect(hub.getState().document).toBe(before);
    expect(hub.getState().canRedo).toBe(true);
    expect(hub.redo()).toBe(true);
    expect(elementById(hub.getState().document, id)!.transform.position[2]).toBeCloseTo(5, 2);
  });

  it("escrever depois de anular deita fora o redo (não pode haver dois futuros)", () => {
    const hub = store();
    const id = firstOf("wall");
    hub.applyTransform(id, { position: [0, 0, 5] });
    hub.applyTransform(id, { position: [0, 0, 10] });
    hub.undo();
    expect(hub.getState().canRedo).toBe(true);
    hub.applyTransform(id, { position: [0, 0, 15] });
    expect(hub.getState().canRedo).toBe(false);
  });

  it("o histórico tem teto declarado e não cresce sem limite", () => {
    const hub = store();
    const id = firstOf("wall");
    for (let step = 1; step <= HISTORY_LIMIT + 6; step += 1) {
      hub.applyTransform(id, { position: [0, 0, step] });
    }
    expect(hub.getState().historyDepth).toBe(HISTORY_LIMIT);
    // E continua a poder anular-se até ao ponto em que o teto corta, nem um passo mais.
    let undone = 0;
    while (hub.undo()) {
      undone += 1;
    }
    expect(undone).toBe(HISTORY_LIMIT);
  });

  it("ocultar é reversível mas não é uma edição do projeto", () => {
    const hub = store();
    const id = firstOf("wall");
    hub.setElementVisibility(id, false);
    expect(hub.getState().edits).toBe(0);
    expect(hub.getState().historyDepth).toBe(1);
    hub.undo();
    expect(elementById(hub.getState().document, id)!.visible).toBe(true);
  });

  it("mudar de projeto limpa o histórico (o undo não atravessa edifícios)", () => {
    const hub = store();
    hub.applyTransform(firstOf("wall"), { position: [0, 0, 5] });
    hub.load(demoProjects[1]!);
    expect(hub.getState().canUndo).toBe(false);
    expect(hub.getState().edits).toBe(0);
  });
});

describe("acabamentos e luz no estado", () => {
  it("trocar acabamento conta como edição e é anulável", () => {
    const hub = store();
    const id = firstOf("wall");
    expect(hub.setMaterial(id, "glazing")).toBe(true);
    expect(elementById(hub.getState().document, id)!.materialId).toBe("glazing");
    expect(hub.getState().edits).toBe(1);
    hub.undo();
    expect(elementById(hub.getState().document, id)!.materialId).not.toBe("glazing");
  });

  it("recusa de acabamento não conta e mostra o motivo da regra", () => {
    const hub = store();
    expect(hub.setMaterial(firstOf("terrain"), "slab")).toBe(false);
    expect(hub.getState().edits).toBe(0);
    expect(hub.getState().historyDepth).toBe(0);
    expect(hub.getState().rejected.length).toBe(1);
  });

  it("o preset de luz é estado de apresentação: não entra no documento nem no histórico", () => {
    const hub = store();
    const document = hub.getState().document;
    hub.setLightingPreset("noite");
    expect(hub.getState().lightingPreset).toBe("noite");
    expect(hub.getState().document).toBe(document);
    expect(hub.getState().historyDepth).toBe(0);
    expect(hub.getState().edits).toBe(0);
    expect(LIGHTING_PRESETS.noite.night).toBe(true);
  });
});
