import { buildDemoDocument } from "@/three/demo-building";
import {
  elementById,
  withCategoryVisibility,
  withTransform,
  withVisibility,
  type ElementCategory,
  type SceneDocument,
  type SceneElement,
  type TransformPatch,
} from "@/three/model";
import { buildRenderPlan, type RenderPlan } from "@/three/render-plan";
import type { ViewPreset } from "@/three/engine/camera-controller";
import type { GizmoMode } from "@/three/engine/transform-gizmo";
import type { DemoProject } from "@/demo/projects";

/**
 * Estado do editor, **fora do React**.
 *
 * Porquê um módulo próprio: (a) as regras de edição vivem no documento, e o documento é um objeto
 * puro — um store explícito deixa testar seleção, visibilidade e transformações sem browser nem
 * `@testing-library`; (b) a seleção tem de ser lida pela cena *e* pelas painéis ao mesmo tempo, e
 * um `useState` em cada componente criaria versões diferentes da mesma verdade.
 *
 * O que deliberadamente **não** está aqui: FPS, frames, *hover* e ângulo de câmara. São sinais do
 * ciclo de renderização; pô-los num store React faria re-renderizar a árvore 60 vezes por segundo.
 *
 * Persistência: nenhuma. As edições vivem nesta página, nesta sessão. Não há `localStorage` nem
 * servidor por detrás disto — dizer o contrário seria fingir uma persistência que não existe.
 */

export type EditorTool = "selecionar" | GizmoMode;

export const EDITOR_TOOLS: readonly { value: EditorTool; label: string }[] = [
  { value: "selecionar", label: "Selecionar" },
  { value: "translate", label: "Mover" },
  { value: "rotate", label: "Rodar" },
  { value: "scale", label: "Escalar" },
];

/** Comandos de câmara: passam pelo estado para que a UI não precise de referências ao palco. */
export type ViewCommand =
  | { readonly kind: "preset"; readonly preset: ViewPreset }
  | { readonly kind: "reset" }
  | { readonly kind: "focus" }
  | { readonly kind: "orbit"; readonly direction: "left" | "right" | "up" | "down" }
  | { readonly kind: "zoom"; readonly direction: "in" | "out" };

export interface EditorState {
  readonly document: SceneDocument;
  readonly sourceSlug: string;
  readonly selection: readonly string[];
  readonly tool: EditorTool;
  /** Motivos devolvidos pela última tentativa recusada — para a UI os mostrar, não os esconder. */
  readonly rejected: readonly string[];
  readonly edits: number;
  readonly viewCommand: { readonly command: ViewCommand; readonly nonce: number } | null;
}

export interface EditorStore {
  getState(): EditorState;
  subscribe(listener: () => void): () => void;
  load(project: DemoProject): void;
  select(elementId: string | null, additive?: boolean): void;
  setTool(tool: EditorTool): void;
  /** Única porta de escrita geométrica: passa sempre por `withTransform` (regras + *snapping*). */
  applyTransform(elementId: string, patch: TransformPatch): boolean;
  setElementVisibility(elementId: string, visible: boolean): void;
  setCategoryVisibility(category: ElementCategory, visible: boolean): void;
  requestView(command: ViewCommand): void;
  reset(): void;
}

export interface EditorStoreOptions {
  readonly project: DemoProject;
  /** Permite ao teste injetar um documento fixo sem voltar a chamar o gerador. */
  readonly document?: SceneDocument;
}

export function createEditorStore(options: EditorStoreOptions): EditorStore {
  const initial: EditorState = {
    document: options.document ?? buildDemoDocument(options.project),
    sourceSlug: options.project.slug,
    selection: [],
    tool: "selecionar",
    rejected: [],
    edits: 0,
    viewCommand: null,
  };

  let state = initial;
  const listeners = new Set<() => void>();
  let nonce = 0;

  function set(patch: Partial<EditorState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(project) {
      nonce += 1;
      state = {
        ...initial,
        document: buildDemoDocument(project),
        sourceSlug: project.slug,
        // Mudar de projeto é mudar de volume: o enquadramento tem de ser pedido outra vez.
        viewCommand: { command: { kind: "reset" }, nonce },
      };
      for (const listener of listeners) {
        listener();
      }
    },
    select(elementId, additive = false) {
      if (elementId === null) {
        if (state.selection.length === 0) {
          return;
        }
        set({ selection: [], tool: state.tool === "selecionar" ? state.tool : "selecionar" });
        return;
      }
      const current = state.selection;
      const next = additive
        ? current.includes(elementId)
          ? current.filter((id) => id !== elementId)
          : [...current, elementId]
        : [elementId];
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return;
      }
      // Uma ferramenta só faz sentido com um elemento; com uma seleção múltipla volta a "selecionar".
      const tool: EditorTool = next.length === 1 ? state.tool : "selecionar";
      set({ selection: next, tool, rejected: [] });
    },
    setTool(tool) {
      if (tool === state.tool) {
        return;
      }
      if (tool !== "selecionar" && state.selection.length !== 1) {
        // Recusar com razão é melhor do que acender um botão que não faz nada.
        set({ rejected: ["Escolhe um único elemento para usar esta ferramenta."] });
        return;
      }
      set({ tool, rejected: [] });
    },
    applyTransform(elementId, patch) {
      const result = withTransform(state.document, elementId, patch);
      if (!result.applied) {
        // Nada mudou: mostramos o motivo e não contamos isto como edição.
        set({ rejected: result.rejected });
        return false;
      }
      // `applied` com `rejected` não-vazio é a aplicação *parcial* (ex.: moveu-se em X, a rotação
      // foi recusada). O documento é o que mudou; o motivo continua visível no painel.
      set({ document: result.document, rejected: result.rejected, edits: state.edits + 1 });
      return true;
    },
    setElementVisibility(elementId, visible) {
      set({ document: withVisibility(state.document, elementId, visible) });
    },
    setCategoryVisibility(category, visible) {
      set({ document: withCategoryVisibility(state.document, category, visible) });
    },
    requestView(command) {
      nonce += 1;
      set({ viewCommand: { command, nonce } });
    },
    reset() {
      const rebuilt = buildDemoDocument({ ...options.project });
      nonce += 1;
      state = {
        ...initial,
        document: rebuilt,
        sourceSlug: options.project.slug,
        viewCommand: { command: { kind: "reset" }, nonce },
      };
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/** O plano é derivado do documento: recomputar é barato, manter duas fontes de verdade não é. */
export function planFor(state: EditorState): RenderPlan {
  return buildRenderPlan(state.document, true);
}

export function selectedElements(state: EditorState): readonly SceneElement[] {
  return state.selection
    .map((id) => elementById(state.document, id))
    .filter((element): element is SceneElement => element !== undefined);
}

/** Estado de visibilidade por categoria, lido do documento (não de uma flag paralela). */
export function categoryVisibility(
  document: SceneDocument,
): Readonly<Record<ElementCategory, { visible: number; hidden: number }>> {
  const out = {} as Record<ElementCategory, { visible: number; hidden: number }>;
  for (const element of document.elements) {
    const entry = out[element.category] ?? { visible: 0, hidden: 0 };
    if (element.visible) {
      entry.visible += 1;
    } else {
      entry.hidden += 1;
    }
    out[element.category] = entry;
  }
  return out;
}

export function isCategoryVisible(state: EditorState, category: ElementCategory): boolean {
  const entry = categoryVisibility(state.document)[category];
  return entry === undefined ? true : entry.visible > 0;
}
