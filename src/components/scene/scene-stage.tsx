"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RadioCards } from "@/components/ui/radio-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { ui } from "@/i18n/pt";
import type { Massing } from "@/demo/massing";
import { usePreferences, useVisualSignals } from "@/lib/preferences-store";
import { useWebglSupport } from "@/lib/use-webgl-support";
import { isConstrainedDevice } from "@/lib/webgl";
import { SceneFallback } from "./scene-fallback";

/**
 * `three` só é descarregado quando há WebGL e o utilizador escolheu a vista 3D.
 * `ssr: false` é obrigatório aqui: o servidor não tem canvas nem GPU.
 */
const SceneView = dynamic(() => import("./scene-view").then((module) => module.SceneView), {
  ssr: false,
  loading: () => (
    <div className="grid gap-3" aria-busy="true">
      <Skeleton className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]" />
      <p className="text-2xs text-ink-muted">{ui.scene.loading}</p>
    </div>
  ),
});

export interface SceneStageProps {
  readonly massing: Massing;
  readonly projectName: string;
}

/**
 * Decide *como* o volume é mostrado: WebGL quando existe, planta + tabela sempre que não.
 *
 * `unknown` é o que o servidor vê (renderiza o esqueleto); `supported` surge logo a seguir à
 * hidratação, sem passagem por um estado intermédio pintado.
 *
 * A alternativa não é um ecrã de erro escondido: é uma das duas vistas do seletor, pelo que
 * o utilizador pode escolhê-la conscientemente (e é o que um leitor de ecrã consome).
 */
export function SceneStage({ massing, projectName }: SceneStageProps): ReactNode {
  const { preferences } = usePreferences();
  const support = useWebglSupport();
  const [lost, setLost] = useState(false);
  const [view, setView] = useState<"3d" | "plan">("3d");
  const [reloadKey, setReloadKey] = useState(0);

  // Resolvidos a partir do `<html>` (fonte única do tema/movimento aplicados): o mesmo valor
  // que o CSS vê, e re-lido sempre que as preferências ou o sistema mudam.
  const { reducedMotion, resolvedTheme: theme } = useVisualSignals();

  const resolving = support === "unknown";
  const webglAvailable = support === "supported" && !lost;
  const show3d = webglAvailable && view === "3d";
  const showFallback = !resolving && !show3d;
  const constrained = isConstrainedDevice();

  const options = [
    {
      value: "3d" as const,
      label: ui.scene.view3dLabel,
      description: constrained ? "Qualidade adaptada a este dispositivo" : "Órbita, zoom e luzes fixas",
      disabled: !webglAvailable,
    },
    {
      value: "plan" as const,
      label: ui.scene.viewPlanLabel,
      description: "SVG e tabela desenhados a partir dos mesmos dados",
    },
  ];

  return (
    <section aria-labelledby="scene-heading" className="surface-quiet grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="scene-heading" className="text-lg leading-snug">
            {ui.scene.title}
          </h2>
          <p className="max-w-[62ch] text-xs text-ink-muted">{ui.scene.legend}</p>
        </div>
        <div className="w-full max-w-sm">
          <RadioCards
            legend={ui.scene.viewsLabel}
            name="scene-view"
            value={view}
            onChange={setView}
            columns={2}
            options={options}
          />
        </div>
      </div>

      {lost ? (
        <Alert
          tone="warning"
          title="Render interrompido"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLost(false);
                setReloadKey((key) => key + 1);
                setView("3d");
              }}
            >
              {ui.scene.reload}
            </Button>
          }
        >
          {ui.scene.contextLost}
        </Alert>
      ) : null}

      {resolving ? (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]" />
          <p className="text-2xs text-ink-muted">{ui.scene.loading}</p>
        </div>
      ) : null}

      {show3d ? (
        <SceneView
          key={reloadKey}
          massing={massing}
          reducedMotion={reducedMotion}
          quality={preferences.sceneQuality}
          theme={theme}
          onContextLost={() => setLost(true)}
        />
      ) : null}

      {showFallback ? (
        <SceneFallback
          massing={massing}
          projectName={projectName}
          reason={
            lost
              ? undefined
              : view === "plan"
                ? "A mostrar a representação vetorial: os mesmos volumes, sem GPU."
                : ui.scene.unsupported.body
          }
        />
      ) : null}
    </section>
  );
}
