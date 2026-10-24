"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { DemoBadge } from "@/components/ui/demo-badge";
import { ui } from "@/i18n/pt";
import { UNIT_CONVENTION_ID } from "@/three/units";
import type { SceneDocument } from "@/three/model";
import type { EditorState } from "./editor-store";
import type { StatsHub, StageStats } from "./stats-hub";

/**
 * Indicadores de estado do palco — discretos, em texto, e sem números inventados.
 *
 * O que aqui aparece saiu do `PerformanceMonitor` do motor (frames reais, desta máquina) ou do
 * documento. Não há FPS "esperado", nem barra de progresso decorativa, nem contagem arredondada
 * para parecer menor do que é. Quando não há palco, diz-se "sem contagens de GPU" em vez de
 * mostrar zeros — zero não é uma medição, é a ausência dela.
 */

const NO_SUBSCRIBE = (): (() => void) => () => undefined;
const NULL_SNAPSHOT = (): StageStats | null => null;

/** Lê o hub em vez de receber o valor por *prop*: só esta linha re-renderiza a ~2,5 Hz. */
function useStageStats(hub: StatsHub | null): StageStats | null {
  return useSyncExternalStore(
    hub === null ? NO_SUBSCRIBE : hub.subscribe,
    hub === null ? NULL_SNAPSHOT : hub.getSnapshot,
    NULL_SNAPSHOT,
  );
}

export interface StatusHudProps {
  readonly state: EditorState;
  readonly document: SceneDocument;
  readonly stats: StatsHub | null;
  readonly mode: "render" | "fallback" | "loading";
}

export function StatusHud({ state, document, stats, mode }: StatusHudProps): ReactNode {
  const sample = useStageStats(stats);
  const visible = document.elements.filter((element) => element.visible).length;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-muted"
      data-editor-status="true"
    >
      <StatusPill tone={mode === "render" ? "success" : mode === "loading" ? "info" : "warning"} dot>
        {mode === "render" ? "Palco ativo" : mode === "loading" ? "A preparar" : "Vetorial (sem WebGL)"}
      </StatusPill>
      <span className="tabular">
        {String(document.elements.length)} elementos · {String(visible)} visíveis ·{" "}
        {sample === null
          ? "sem contagens de GPU"
          : `${String(sample.meshes)} malhas · ${String(sample.calls)} draws`}
      </span>
      {sample !== null ? (
        <span className="tabular">
          {ui.editor.stats(sample.fps, sample.triangles, sample.calls, sample.meshes)}
        </span>
      ) : null}
      <span className="tabular">{ui.editor.edits(state.edits)}</span>
      {state.selection.length > 0 ? (
        <span className="tabular">{ui.editor.selection.multiple(state.selection.length)}</span>
      ) : null}
      <span className="ml-auto flex items-center gap-2">
        <span className="tabular">{UNIT_CONVENTION_ID}</span>
        <DemoBadge />
      </span>
    </div>
  );
}
