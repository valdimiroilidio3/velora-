"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, MoveUpRight, RotateCcw, RotateCw, Rotate3d, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n/pt";
import type { Massing } from "@/demo/massing";
import { isConstrainedDevice } from "@/lib/webgl";
import { cn } from "@/lib/cn";
import {
  SCENE_DOLLY_STEP,
  SCENE_PITCH_STEP,
  SCENE_VIEW_PRESETS,
  SCENE_YAW_STEP,
  createVolumeScene,
  type SceneStats,
  type SceneViewPreset,
  type VolumeScene,
} from "./volume-scene";

export interface SceneViewProps {
  readonly massing: Massing;
  readonly reducedMotion: boolean;
  readonly quality: "auto" | "detailed" | "balanced";
  /** Tema ativo: as cores da cena vêm dos tokens, por isso é preciso sincronizar. */
  readonly theme: string;
  onContextLost: () => void;
}

/**
 * Vista 3D interativa. Componente cliente *carregado sem SSR*: o `three.js` só entra no
 * bundle desta rota e só depois de haver contexto WebGL confirmado (ver `scene-stage.tsx`).
 */
export function SceneView({
  massing,
  reducedMotion,
  quality,
  theme,
  onContextLost,
}: SceneViewProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<VolumeScene | null>(null);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [preset, setPreset] = useState<SceneViewPreset>("nordeste");
  const [autoRotate, setAutoRotate] = useState(false);

  const highPerformance = quality === "detailed" || (quality === "auto" && !isConstrainedDevice());

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas === null || container === null) {
      return;
    }
    const api = createVolumeScene(canvas, container, massing, {
      reducedMotion,
      highPerformance,
      onContextLost,
      onStats: setStats,
    });
    apiRef.current = api;
    if (api === null) {
      onContextLost();
      return;
    }
    return () => {
      apiRef.current = null;
      api?.dispose();
    };
  }, [massing, reducedMotion, highPerformance, onContextLost]);

  // As cores vêm do CSS: quando o tema muda, sincronizamos em vez de reconstruir a cena.
  useEffect(() => {
    apiRef.current?.syncTheme();
  }, [theme]);

  useEffect(() => {
    apiRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // A órbita automática é *derivada*: com movimento reduzido a caixa está desativada, pelo que
  // não há estado para "limpar" dentro de um efeito.
  useEffect(() => {
    apiRef.current?.setAutoRotate(autoRotate && !reducedMotion);
  }, [autoRotate, reducedMotion]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const api = apiRef.current;
    if (api === null) {
      return;
    }
    switch (event.key) {
      case "ArrowLeft":
        api.orbit(-SCENE_YAW_STEP, 0);
        break;
      case "ArrowRight":
        api.orbit(SCENE_YAW_STEP, 0);
        break;
      case "ArrowUp":
        api.orbit(0, SCENE_PITCH_STEP);
        break;
      case "ArrowDown":
        api.orbit(0, -SCENE_PITCH_STEP);
        break;
      case "+":
      case "=":
        api.dolly(1 / SCENE_DOLLY_STEP);
        break;
      case "-":
      case "_":
        api.dolly(SCENE_DOLLY_STEP);
        break;
      case "0":
        api.setView("nordeste");
        setPreset("nordeste");
        break;
      default:
        return;
    }
    event.preventDefault();
  }, []);

  function applyView(value: SceneViewPreset): void {
    setPreset(value);
    apiRef.current?.setView(value);
  }

  // Cada botão tem um callback estável criado fora do render. Ler `apiRef.current` dentro do
  // JSX — mesmo embrulhado em closures ou arrays — é o que `react-hooks/refs` proíbe, e proíbe
  // por bom motivo: a cena é mutável e o render não deve depender da identidade do objeto.
  const orbitLeft = useCallback(() => apiRef.current?.orbit(-SCENE_YAW_STEP, 0), []);
  const orbitRight = useCallback(() => apiRef.current?.orbit(SCENE_YAW_STEP, 0), []);
  const tiltUp = useCallback(() => apiRef.current?.orbit(0, SCENE_PITCH_STEP), []);
  const tiltDown = useCallback(() => apiRef.current?.orbit(0, -SCENE_PITCH_STEP), []);
  const zoomIn = useCallback(() => apiRef.current?.dolly(1 / SCENE_DOLLY_STEP), []);
  const zoomOut = useCallback(() => apiRef.current?.dolly(SCENE_DOLLY_STEP), []);

  return (
    <div className="grid gap-3">
      <div
        ref={containerRef}
        role="group"
        tabIndex={0}
        aria-label="Cena 3D: arrasta ou usa as teclas de direção para enquadrar"
        onKeyDown={handleKeyDown}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-canvas-sunken outline-offset-2 sm:aspect-[16/9] lg:aspect-[21/9]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
        <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-1 text-2xs text-ink-muted">
          {ui.scene.controls.dragHint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Enquadramento">
          {SCENE_VIEW_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => applyView(item.value)}
              aria-pressed={preset === item.value}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs transition-colors duration-150 ease-quart-out",
                preset === item.value
                  ? "border-accent/40 bg-accent-soft font-medium text-accent-ink"
                  : "border-line-control bg-surface text-ink-muted hover:border-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Câmara">
          <Button
            variant="secondary"
            size="sm"
            onClick={orbitLeft}
            aria-label={ui.scene.controls.rotateLeft}
            title={ui.scene.controls.rotateLeft}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.rotateLeft}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={orbitRight}
            aria-label={ui.scene.controls.rotateRight}
            title={ui.scene.controls.rotateRight}
          >
            <RotateCw aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.rotateRight}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={tiltUp}
            aria-label={ui.scene.controls.tiltUp}
            title={ui.scene.controls.tiltUp}
          >
            <MoveUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.tiltUp}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={tiltDown}
            aria-label={ui.scene.controls.tiltDown}
            title={ui.scene.controls.tiltDown}
          >
            <Maximize2 aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.tiltDown}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomIn}
            aria-label={ui.scene.controls.zoomIn}
            title={ui.scene.controls.zoomIn}
          >
            <ZoomIn aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.zoomIn}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomOut}
            aria-label={ui.scene.controls.zoomOut}
            title={ui.scene.controls.zoomOut}
          >
            <ZoomOut aria-hidden="true" className="size-4" />
            <span className="sr-only">{ui.scene.controls.zoomOut}</span>
          </Button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={autoRotate}
            disabled={reducedMotion}
            onChange={(event) => setAutoRotate(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {ui.scene.orbitLabel}
        </label>

        <p className="tabular ml-auto text-2xs text-ink-muted">
          {stats === null ? ui.scene.loading : ui.scene.statsLabel(stats.fps, stats.triangles, stats.calls)}
        </p>
      </div>

      <p className="flex items-center gap-2 text-2xs text-ink-muted">
        <Rotate3d aria-hidden="true" className="size-3.5 shrink-0" />
        {reducedMotion ? ui.scene.reduced.body : ui.scene.orbitHint} {ui.scene.keyboardHint}
      </p>
    </div>
  );
}
