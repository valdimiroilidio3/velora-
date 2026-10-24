"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { readCssToken } from "./read-token";
import { planFor, type EditorState, type EditorStore } from "./editor-store";
import { createEditorViewport, type EditorViewport, type QualityTier } from "@/three/engine/viewport";
import { formatSample } from "@/three/engine/performance-monitor";
import type { StatsHub } from "./stats-hub";
import { cn } from "@/lib/cn";
import { ui } from "@/i18n/pt";

/**
 * Palco 3D em React. A regra deste componente é curta: **o React não sabe do `three`**.
 *
 * O motor vive num `useEffect` com o canvas como âncora e um `useRef` como posse. O estado do
 * editor entra por `setPlan`/`setSelection`/`setTool`; sai por `onPick`/`onCommit`, que escrevem
 * no store. Nada de `setState` dentro de efeitos — seria um ciclo de render por frame.
 *
 * `quality` entra por *ref* e é aplicado a quente (`setQuality`): recriar o motor para mudar a
 * sombra seria deitar fora a câmera do utilizador. O antialias, esse, é fixo no arranque — é o
 * único compromisso que o WebGL impõe.
 */

export interface Viewport3DProps {
  readonly state: EditorState;
  readonly store: EditorStore;
  readonly quality: QualityTier;
  readonly reducedMotion: boolean;
  /** Tema resolvido: as cores vêm dos tokens CSS, por isso a cena tem de ser avisada. */
  readonly theme: string;
  onContextLost: () => void;
  onFailure: (message: string) => void;
  /** Onde o HUD lê as contagens reais. Escrito, nunca lido por este componente. */
  readonly stats?: StatsHub | undefined;
  className?: string;
}

export function Viewport3D({
  state,
  store,
  quality,
  reducedMotion,
  theme,
  onContextLost,
  onFailure,
  stats,
  className,
}: Viewport3DProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EditorViewport | null>(null);

  // Valores correntes para os efeitos de montagem, sem os tornar dependência de recriação.
  const latest = useRef({ state, quality, onContextLost, onFailure });
  useEffect(() => {
    latest.current = { state, quality, onContextLost, onFailure };
  });

  const [sample, setSample] = useState<string | null>(null);
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
    // Sair do palco deixa o HUD sem números em vez de mostrar os últimos de uma cena morta.
    if (stats === undefined) {
      return;
    }
    return () => stats.clear();
  }, [stats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas === null || container === null) {
      return;
    }
    let engine: EditorViewport;
    try {
      engine = createEditorViewport({
        canvas,
        container,
        readToken: readCssToken,
        plan: planFor(latest.current.state),
        quality: latest.current.quality,
        reducedMotion,
        onPick: (elementId, additive) => store.select(elementId, additive),
        onCommit: (elementId, patch) => store.applyTransform(elementId, patch),
        onStats: (next) => {
          setSample(formatSample(next));
          statsRef.current?.push({
            fps: next.fps,
            frameMs: next.frameMs,
            calls: next.calls,
            triangles: next.triangles,
            geometries: next.geometries,
            meshes: next.meshes ?? 0,
            drawnFrames: next.drawnFrames,
          });
        },
        onContextLost: () => latest.current.onContextLost(),
      });
    } catch (error) {
      latest.current.onFailure(error instanceof Error ? error.message : "WebGL indisponível");
      return;
    }
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [reducedMotion, store]);

  useEffect(() => {
    engineRef.current?.setPlan(planFor(state));
  }, [state]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine === null) {
      return;
    }
    engine.setSelection([...state.selection]);
    engine.setTool(state.tool === "selecionar" ? null : state.tool);
  }, [state.selection, state.tool]);

  useEffect(() => {
    engineRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    engineRef.current?.applyTheme();
  }, [theme]);

  useEffect(() => {
    const engine = engineRef.current;
    const command = state.viewCommand;
    if (engine === null || command === null) {
      return;
    }
    switch (command.command.kind) {
      case "preset":
        engine.setView(command.command.preset);
        break;
      case "reset":
        // `frameAll` é a reposição: mesma moldura do arranque, mesma Prespetiva.
        engine.frameAll();
        break;
      case "focus":
        engine.focusSelection();
        break;
      case "orbit":
        engine.orbit(command.command.direction);
        break;
      case "zoom":
        engine.zoom(command.command.direction);
        break;
    }
  }, [state.viewCommand]);

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>): void => {
    const map = {
      ArrowLeft: ["orbit", "left"],
      ArrowRight: ["orbit", "right"],
      ArrowUp: ["orbit", "up"],
      ArrowDown: ["orbit", "down"],
    } as const;
    const key = event.key;
    const mapped = (map as Record<string, readonly ["orbit", "left" | "right" | "up" | "down"] | undefined>)[
      key
    ];
    if (mapped !== undefined) {
      event.preventDefault();
      store.requestView({ kind: "orbit", direction: mapped[1] });
      return;
    }
    if (key === "+" || key === "=") {
      event.preventDefault();
      store.requestView({ kind: "zoom", direction: "in" });
    } else if (key === "-") {
      event.preventDefault();
      store.requestView({ kind: "zoom", direction: "out" });
    } else if (key === "f") {
      event.preventDefault();
      store.requestView({ kind: "focus" });
    } else if (key === "Escape") {
      store.select(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative isolate overflow-hidden rounded-xl border border-line bg-canvas", className)}
      data-editor-viewport="true"
    >
      <canvas
        ref={canvasRef}
        className="block h-full min-h-[280px] w-full touch-pan-y focus-visible:outline-none"
        tabIndex={0}
        role="application"
        aria-label={`${ui.editor.title} — ${ui.editor.keyboardHint}`}
        onKeyDown={onKeyDown}
      />
      <p className="pointer-events-none absolute bottom-2 left-2 max-w-[36ch] rounded-md bg-canvas/85 px-2 py-1 text-2xs text-ink-muted">
        {sample ?? ui.editor.idle}
      </p>
    </div>
  );
}
