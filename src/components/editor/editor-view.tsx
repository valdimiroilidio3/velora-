"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/ui/demo-badge";
import { ui } from "@/i18n/pt";
import type { DemoProject } from "@/demo/projects";
import { usePreferences, useVisualSignals } from "@/lib/preferences-store";
import { useWebglSupport } from "@/lib/use-webgl-support";
import { createEditorStore } from "./editor-store";
import { useEditorStore } from "./use-editor-store";
import { HierarchyTree } from "./hierarchy-tree";
import { PropertiesPanel } from "./properties-panel";
import { EditorToolbar } from "./editor-toolbar";
import { StatusHud } from "./status-hud";
import { tierFor } from "./quality";
import { createStatsHub } from "./stats-hub";

/**
 * O palco entra sem SSR: `three` nunca corre no servidor (não há canvas nem GPU) e só é descarregado
 * quando há WebGL. É a mesma fronteira já usada em `scene-stage.tsx`, pelo mesmo motivo.
 */
const Viewport3D = dynamic(() => import("./viewport-3d").then((module) => module.Viewport3D), {
  ssr: false,
  loading: () => (
    <div className="grid gap-3" aria-busy="true">
      <Skeleton className="h-[min(70vh,42rem)] w-full" />
      <p className="text-2xs text-ink-muted">{ui.editor.loading}</p>
    </div>
  ),
});

export interface EditorViewProps {
  readonly project: DemoProject;
}

/**
 * Vista do editor: toolbar + palco + hierarquia + propriedades + estado.
 *
 * Estrutura de decisão: o estado vive no store, o palco é uma *vista* sobre o documento e as
 * painéis são outras duas. Não há três fontes de verdade — e é por isso que a seleção sincroniza em
 * ambos os sentidos sem código de sincronização.
 */
export function EditorView({ project }: EditorViewProps): ReactNode {
  const [store] = useState(() => createEditorStore({ project }));
  const state = useEditorStore(store);
  const { preferences, set } = usePreferences();
  const { reducedMotion, resolvedTheme } = useVisualSignals();
  const support = useWebglSupport();
  const [contextLost, setContextLost] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statsHub] = useState(() => createStatsHub());

  const resolving = support === "unknown";
  const broken = contextLost || failure !== null;
  const showViewport = support === "supported" && !broken;
  const quality = tierFor(preferences.sceneQuality, false);

  return (
    <div className="grid gap-4" data-editor-root="true">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="grid gap-1">
            <h1 className="text-2xl leading-tight text-ink">{ui.editor.title}</h1>
            <p className="max-w-[72ch] text-xs text-ink-muted">{ui.editor.subtitle}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => store.reset()}>
            Repor modelo
          </Button>
        </div>
        <DemoNotice />
        <p className="max-w-[76ch] text-2xs text-ink-muted">{ui.editor.notice}</p>
      </header>

      <EditorToolbar
        state={state}
        store={store}
        quality={preferences.sceneQuality}
        onQualityChange={(value) => set("sceneQuality", value)}
        stageActive={showViewport}
      />

      {broken ? (
        <Alert
          tone="warning"
          title={contextLost ? "Render interrompido" : ui.editor.noWebgl.title}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setContextLost(false);
                setFailure(null);
                setReloadKey((key) => key + 1);
              }}
            >
              {ui.editor.reload}
            </Button>
          }
        >
          {contextLost ? ui.editor.contextLost : (failure ?? ui.editor.noWebgl.body)}
        </Alert>
      ) : null}

      {resolving ? (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-[min(70vh,42rem)] w-full" />
          <p className="text-2xs text-ink-muted">{ui.editor.loading}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-2">
          {showViewport ? (
            <Viewport3D
              key={reloadKey}
              state={state}
              store={store}
              quality={quality}
              reducedMotion={reducedMotion}
              theme={resolvedTheme}
              onContextLost={() => setContextLost(true)}
              onFailure={(message) => setFailure(message)}
              stats={statsHub}
              className="h-[min(70vh,42rem)]"
            />
          ) : (
            <div className="surface-card grid content-center gap-2 p-6 text-center">
              <p className="text-sm text-ink">{ui.editor.noWebgl.title}</p>
              <p className="mx-auto max-w-[60ch] text-2xs text-ink-muted">{ui.editor.noWebgl.body}</p>
            </div>
          )}
          <StatusHud
            state={state}
            document={state.document}
            stats={statsHub}
            mode={showViewport ? "render" : resolving ? "loading" : "fallback"}
          />
        </div>

        <div className="grid min-w-0 gap-3">
          <HierarchyTree document={state.document} selection={state.selection} store={store} />
          <PropertiesPanel state={state} store={store} />
        </div>
      </div>
    </div>
  );
}
