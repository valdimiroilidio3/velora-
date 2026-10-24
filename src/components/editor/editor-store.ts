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
import { withMaterial } from "@/three/model";
import { LIGHTING_PRESET_IDS, type LightingPresetId } from "@/three/lighting-presets";
import type { MaterialId } from "@/three/model";
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
 *
 * O histórico é **real e limitado**: `undo`/`redo` só existem porque cada escrita aplicável empurra o
 * documento anterior para uma pilha. Não é um botão decorativo, e o teto (`HISTORY_LIMIT`) é
 * declarado em vez de ser " infinita", porque 518 elementos × 80 documentos é memória que o
 * separador do utilizador não tem de gastar.
 */

/** Passos de histórico guardados por documento (≈ 40 × 518 elementos serializáveis). */
export const HISTORY_LIMIT = 40;

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
  /** *Preset* de iluminação do palco — estado de apresentação, não do documento. */
  readonly lightingPreset: LightingPresetId;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly historyDepth: number;
}

/** O preset inicial vem do catálogo; `undefined` nunca é uma hipótese para a UI. */
const DEFAULT_PRESET: LightingPresetId = LIGHTING_PRESET_IDS[1] ?? "meio-dia";

export interface EditorStore {
  getState(): EditorState;
  subscribe(listener: () => void): () => void;
  load(project: DemoProject): void;
  select(elementId: string | null, additive?: boolean): void;
  setTool(tool: EditorTool): void;
  /** Única porta de escrita geométrica: passa sempre por `withTransform` (regras + *snapping*). */
  applyTransform(elementId: string, patch: TransformPatch): boolean;
  /** Troca o acabamento de um elemento; a compatibilidade é decidida em `materials.ts`, não aqui. */
  setMaterial(elementId: string, materialId: MaterialId): boolean;
  setLightingPreset(preset: LightingPresetId): void;
  undo(): boolean;
  redo(): boolean;
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
    lightingPreset: DEFAULT_PRESET,
    canUndo: false,
    canRedo: false,
    historyDepth: 0,
  };

  let state = initial;
  const listeners = new Set<() => void>();
  let nonce = 0;
  /** Pilhas de histórico com o documento **anterior** por entrada: `undo` não reconstrói nada. */
  let past: SceneDocument[] = [];
  let future: SceneDocument[] = [];

  function historyPatch(): Pick<EditorState, "canUndo" | "canRedo" | "historyDepth"> {
    return { canUndo: past.length > 0, canRedo: future.length > 0, historyDepth: past.length };
  }

  /**
   * Única forma de mudar o documento a partir daqui: empurra o estado anterior para o histórico,
   * limpa o `future` (escrever depois de um `undo` não pode manter o redo) e conta a edição.
   * `countsAsEdit: false` é para navegação de visibilidade, que é reversível mas não é um projeto.
   */
  function commit(document: SceneDocument, rejected: readonly string[], countsAsEdit = true): void {
    past = [...past, state.document];
    if (past.length > HISTORY_LIMIT) {
      past = past.slice(past.length - HISTORY_LIMIT);
    }
    future = [];
    set({
      document,
      rejected,
      ...(countsAsEdit ? { edits: state.edits + 1 } : {}),
      ...historyPatch(),
    });
  }

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
      past = [];
      future = [];
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
      commit(result.document, result.rejected);
      return true;
    },
    setMaterial(elementId, materialId) {
      const result = withMaterial(state.document, elementId, materialId);
      if (!result.applied) {
        set({ rejected: result.rejected });
        return false;
      }
      commit(result.document, result.rejected);
      return true;
    },
    setLightingPreset(preset) {
      if (preset === state.lightingPreset) {
        return;
      }
      set({ lightingPreset: preset });
    },
    undo() {
      const previous = past[past.length - 1];
      if (previous === undefined) {
        return false;
      }
      past = past.slice(0, -1);
      future = [state.document, ...future].slice(0, HISTORY_LIMIT);
      set({ document: previous, ...historyPatch() });
      return true;
    },
    redo() {
      const next = future[0];
      if (next === undefined) {
        return false;
      }
      future = future.slice(1);
      past = [...past, state.document];
      set({ document: next, ...historyPatch() });
      return true;
    },
    setElementVisibility(elementId, visible) {
      commit(withVisibility(state.document, elementId, visible), state.rejected, false);
    },
    setCategoryVisibility(category, visible) {
      commit(withCategoryVisibility(state.document, category, visible), state.rejected, false);
    },
    requestView(command) {
      nonce += 1;
      set({ viewCommand: { command, nonce } });
    },
    reset() {
      const rebuilt = buildDemoDocument({ ...options.project });
      nonce += 1;
      past = [];
      future = [];
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
