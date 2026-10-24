"use client";

import { Eye, Hand, Maximize2, Move, Rotate3d, RotateCcw, Scaling } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { VIEW_PRESETS } from "@/three/view-presets";
import { EDIT_LIMITS } from "@/three/materials";
import { ui } from "@/i18n/pt";
import { cn } from "@/lib/cn";
import { EDITOR_TOOLS, type EditorState, type EditorStore, type EditorTool } from "./editor-store";
import { QUALITY_CONTROL, tierFor } from "./quality";
import type { SceneQuality } from "@/lib/preferences";
import { isConstrainedDevice } from "@/lib/webgl";

/**
 * Barra de ferramentas do editor. Dois princípios:
 *  · o que a regra de edição recusa não é oferecido — o botão aparece desativado **com o motivo**;
 *  · tudo o que mexe na câmera passa pelo store (`requestView`), porque o palco é o único dono do
 *    `OrbitControls` e uma segunda via de escrita seria a receita para estados divergentes.
 */

const TOOL_ICONS: Record<EditorTool, typeof Hand> = {
  selecionar: Hand,
  translate: Move,
  rotate: Rotate3d,
  scale: Scaling,
};

export interface EditorToolbarProps {
  readonly state: EditorState;
  readonly store: EditorStore;
  readonly quality: SceneQuality;
  onQualityChange: (value: SceneQuality) => void;
  /** O gizmo só faz sentido com palco: sem WebGL as transformações continuam pelo painel. */
  readonly stageActive: boolean;
}

export function EditorToolbar({
  state,
  store,
  quality,
  onQualityChange,
  stageActive,
}: EditorToolbarProps): ReactNode {
  const single = state.selection.length === 1;
  const tier = tierFor(quality, isConstrainedDevice());

  return (
    <div
      role="toolbar"
      aria-label={ui.editor.toolsLabel}
      aria-orientation="horizontal"
      className="surface-quiet flex flex-wrap items-center gap-x-4 gap-y-2 p-2"
    >
      <div className="flex items-center gap-1">
        <span className="text-2xs uppercase tracking-wide text-ink-muted">{ui.editor.toolsLabel}</span>
        {EDITOR_TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.value];
          const active = state.tool === tool.value;
          const disabled = tool.value !== "selecionar" && (!single || !stageActive);
          return (
            <Button
              key={tool.value}
              size="sm"
              variant={active ? "primary" : "secondary"}
              aria-pressed={active}
              disabled={disabled}
              title={
                disabled
                  ? stageActive
                    ? ui.editor.properties.locked
                    : "Sem palco 3D: usa o painel de propriedades."
                  : undefined
              }
              leadingIcon={<Icon aria-hidden="true" />}
              onClick={() => store.setTool(tool.value)}
            >
              {tool.label}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-2xs uppercase tracking-wide text-ink-muted">{ui.editor.viewLabel}</span>
        {VIEW_PRESETS.map((preset) => (
          <Button
            key={preset.value}
            size="sm"
            variant="quiet"
            onClick={() => store.requestView({ kind: "preset", preset: preset.value })}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="quiet"
          leadingIcon={<Maximize2 aria-hidden="true" />}
          onClick={() => store.requestView({ kind: "focus" })}
        >
          {ui.editor.selection.focus}
        </Button>
        <Button
          size="sm"
          variant="quiet"
          leadingIcon={<RotateCcw aria-hidden="true" />}
          onClick={() => store.requestView({ kind: "reset" })}
        >
          {ui.actions.reset}
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <span className="text-2xs uppercase tracking-wide text-ink-muted">{ui.editor.qualityLabel}</span>
        {QUALITY_CONTROL.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={quality === option.value}
            title={`${option.label} — ${option.description}`}
            className={cn(
              "rounded-md px-2 py-1 text-2xs text-ink-secondary transition-colors hover:bg-canvas-sunken",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              quality === option.value && "bg-surface text-ink shadow-e1",
            )}
            onClick={() => onQualityChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="flex w-full items-center gap-1.5 text-2xs text-ink-muted">
        <Eye aria-hidden="true" className="size-3.5 shrink-0" />
        {ui.editor.limits(EDIT_LIMITS.maxOffsetM, EDIT_LIMITS.minScale, EDIT_LIMITS.maxScale)} ·{" "}
        {tier === "alta"
          ? "qualidade detalhada"
          : tier === "leve"
            ? "qualidade leve"
            : "qualidade equilibrada"}
      </p>
    </div>
  );
}
