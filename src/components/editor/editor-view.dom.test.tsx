import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "@/three/demo-building";
import { categoryLabels, type SceneElement } from "@/three/model";
import { MATERIALS } from "@/three/materials";
import { EditorView } from "./editor-view";
import { ui } from "@/i18n/pt";

/**
 * O editor visto do lado do utilizador, em jsdom — e com uma vantagem: o jsdom **não tem WebGL**,
 * exatamente o cenário que a Fase 3 tem de provar que não parte a aplicação. A árvore, as
 * propriedades, as regras de edição e as contagens têm de funcionar sem GPU; só o palco é que não
 * pode existir. As interações com rato no canvas são as de `docs/MANUAL-3D-TESTS.md`.
 */

const project = demoProjects[0]!;
const document_ = buildDemoDocument(project);

function materialLabel(element: SceneElement): string {
  return MATERIALS[element.materialId].label;
}

function renderEditor() {
  return render(<EditorView project={project} />);
}

function tree(): HTMLElement {
  return screen.getByRole("tree", { name: ui.editor.hierarchyLabel });
}

function rowFor(name: string): HTMLElement {
  const row = within(tree())
    .getAllByRole("treeitem")
    .find((item) => item.getAttribute("aria-label")?.startsWith(`${name} —`));
  if (row === undefined) {
    throw new Error(`nó "${name}" não está na árvore`);
  }
  return row as HTMLElement;
}

/** O botão que seleciona é o que tem o rótulo do nó — não conta quantos outros botões há na linha. */
function labelButtonOf(row: HTMLElement, name: string): HTMLButtonElement {
  const button = Array.from(row.querySelectorAll("button")).find((candidate) =>
    (candidate.textContent ?? "").includes(name),
  );
  if (button === undefined) {
    throw new Error(`botão de rótulo em falta para "${name}"`);
  }
  return button as HTMLButtonElement;
}

function selectByName(name: string): void {
  fireEvent.click(labelButtonOf(rowFor(name), name));
}

describe("editor sem WebGL", () => {
  it("apresenta o modelo e diz que o palco não está desenhado", () => {
    renderEditor();
    expect(screen.getByRole("heading", { name: ui.editor.title })).toBeDefined();
    expect(screen.getByText(ui.editor.noWebgl.title)).toBeDefined();
    expect(screen.getByText(/sem contagens de GPU/)).toBeDefined();
    expect(screen.getByText("Demonstração")).toBeDefined();
  });

  it("a hierarquia vem do documento e mostra contagens por nó", () => {
    renderEditor();
    const items = within(tree()).getAllByRole("treeitem");
    expect(items.length).toBeGreaterThan(6);
    expect(within(tree()).getByText(document_.name)).toBeDefined();
    for (const level of document_.levels.slice(0, 3)) {
      expect(within(tree()).getByText(level.label)).toBeDefined();
    }
    expect(tree().textContent).toContain(`${String(document_.elements.length)}`);
  });

  it("selecionar na árvore escreve no estado e o painel mostra o elemento", () => {
    renderEditor();
    const wall = document_.elements.find((element) => element.category === "wall")!;
    selectByName(wall.name);

    const row = rowFor(wall.name);
    // O id é a única coisa aqui com um só candidato: "Montante 1 · norte" repete-se em cada piso.
    expect(screen.getByText(wall.id)).toBeDefined();
    expect(screen.getByText(`${categoryLabels.wall} · ${materialLabel(wall)}`)).toBeDefined();
    expect(row.getAttribute("aria-selected")).toBe("true");
    // A barra de estado diz o mesmo: é a mesma verdade vista do outro lado da página.
    expect(screen.getByText("1 elemento selecionado")).toBeDefined();
  });

  it("esconder uma categoria atualiza a árvore e as contagens", () => {
    renderEditor();
    const windows = document_.elements.filter((element) => element.category === "window");
    const label = categoryLabels.window;
    const hide = Array.from(tree().querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === `${ui.editor.tree.hide}: ${label}`,
    );
    expect(hide).toBeDefined();
    fireEvent.click(hide!);

    // A árvore agrupa por piso: o nó "Janelas" de um piso conta só os vãos daquele piso.
    const rows = within(tree())
      .getAllByRole("treeitem")
      .filter((item) => item.getAttribute("aria-label")?.startsWith(`${label} —`));
    expect(rows.length).toBeGreaterThan(0);
    for (const item of rows) {
      expect(item.getAttribute("aria-label")?.startsWith(`${label} — 0 de `)).toBe(true);
    }
    expect(windows.length).toBeGreaterThan(0);
    // O contador do estado é a mesma contagem noutro sítio do ecrã: saem os vãos de cena.
    const status = document.querySelector("[data-editor-status]") as HTMLElement;
    expect(status.textContent).toContain(`${String(document_.elements.length - windows.length)} visíveis`);
  });

  it("as ferramentas de palco estão desativadas sem palco e sem seleção", () => {
    renderEditor();
    const toolbar = screen.getByRole("toolbar", { name: ui.editor.toolsLabel });
    for (const label of ["Mover", "Rodar", "Escalar"]) {
      const button = within(toolbar).getByRole("button", { name: label });
      expect(button, label).toBeDisabled();
    }
    expect(within(toolbar).getByRole("button", { name: "Selecionar" })).toBeDefined();
  });

  it("escrever uma posição no painel conta como edição e passa pela regra", () => {
    renderEditor();
    const wall = document_.elements.find((element) => element.category === "wall")!;
    selectByName(wall.name);
    const input = screen.getByLabelText(/X · nascente/) as HTMLInputElement;
    expect(input.value).toBe(String(wall.transform.position[0]));
    fireEvent.change(input, { target: { value: "3,45" } });
    fireEvent.click(screen.getByRole("button", { name: ui.editor.properties.apply }));

    expect(screen.getByText("1 edição nesta sessão")).toBeDefined();
    expect(screen.getByText(/0,10 m/)).toBeDefined();
  });

  it("recusa o que a regra não permite, em vez de fingir que aplicou", () => {
    renderEditor();
    const terrain = document_.elements.find((element) => element.category === "terrain")!;
    selectByName(terrain.name);

    // Terreno não é editável por regra: nem campos, nem contador de edições.
    expect(screen.queryByLabelText(/X · nascente/)).toBeNull();
    expect(screen.getByText(/0 edições nesta sessão/)).toBeDefined();
    expect(screen.getAllByText(terrain.name).length).toBeGreaterThan(0);
    expect(screen.getByText(terrain.id)).toBeDefined();
  });

  it("limpar a seleção devolve o painel ao estado vazio", () => {
    renderEditor();
    const wall = document_.elements.find((element) => element.category === "wall")!;
    selectByName(wall.name);
    fireEvent.click(screen.getByRole("button", { name: ui.editor.selection.clear }));
    expect(screen.getByText(ui.editor.selection.empty)).toBeDefined();
    expect(
      within(tree())
        .getAllByRole("treeitem")
        .every((item) => item.getAttribute("aria-selected") === "false"),
    ).toBe(true);
  });
});
