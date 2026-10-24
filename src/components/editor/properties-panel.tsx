"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, controlClass } from "@/components/ui/field";
import { ui } from "@/i18n/pt";
import { ruleFor, scaleAxes, toolsFor } from "@/three/edit-rules";
import { allowedMaterialsFor, MATERIAL_IDS, MATERIALS } from "@/three/materials";
import {
  categoryLabels,
  describeElement,
  elementMetrics,
  type SceneElement,
  type TransformPatch,
} from "@/three/model";
import { areaLabel } from "@/three/units";
import { selectedElements, type EditorState, type EditorStore } from "./editor-store";

/**
 * Painel de propriedades. Só mostra o que o modelo realmente suporta:
 *  · as linhas de leitura vêm do documento (dimensões, cota, área, volume);
 *  · os campos editáveis existem onde a regra de edição o permite, com o passo de *snapping* do
 *    motor no `step` do `<input>` — a UI e o motor não podem divergir sobre a resolução de um número;
 *  · uma recusa é mostrada como recusa, com o motivo da regra. Não fingimos que aplicámos.
 */

export interface PropertiesPanelProps {
  readonly state: EditorState;
  readonly store: EditorStore;
}

export function PropertiesPanel({ state, store }: PropertiesPanelProps): ReactNode {
  const element = selectedElements(state)[0];

  if (state.selection.length > 1) {
    return (
      <section className="surface-card grid gap-2 p-3" aria-labelledby="properties-heading">
        <h2 id="properties-heading" className="text-2xs uppercase tracking-wide text-ink-muted">
          {ui.editor.propertiesLabel}
        </h2>
        <p className="text-xs text-ink-secondary">{ui.editor.selection.multiple(state.selection.length)}</p>
        <p className="text-2xs text-ink-muted">Transformações aplicam-se a um elemento de cada vez.</p>
        <Button size="sm" variant="secondary" onClick={() => store.select(null)}>
          {ui.editor.selection.clear}
        </Button>
      </section>
    );
  }

  if (element === undefined) {
    return (
      <section className="surface-card grid gap-2 p-3" aria-labelledby="properties-heading">
        <h2 id="properties-heading" className="text-2xs uppercase tracking-wide text-ink-muted">
          {ui.editor.propertiesLabel}
        </h2>
        <EmptyState title={ui.editor.selection.empty} description={ui.editor.selection.hint} />
      </section>
    );
  }

  return <ElementForm key={element.id} element={element} store={store} rejected={state.rejected} />;
}

interface ElementFormProps {
  readonly element: SceneElement;
  readonly store: EditorStore;
  readonly rejected: readonly string[];
}

function ElementForm({ element, store, rejected }: ElementFormProps): ReactNode {
  const rule = ruleFor(element.category);
  const axes = scaleAxes(element);
  const tools = toolsFor(element);
  const metrics = elementMetrics(element);
  const editable = !element.locked && tools.length > 1;
  // A lista vem da matriz de compatibilidade do domínio: o painel não decide sozinho o que se pode vestir.
  const materials = allowedMaterialsFor(element.category);

  const [position, setPosition] = useState<string[]>(() =>
    element.transform.position.map((value) => formatNumber(value)),
  );
  const [rotation, setRotation] = useState<string>(() => formatNumber(element.transform.rotationYDeg));
  const [scale, setScale] = useState<string[]>(() =>
    element.transform.scale.map((value) => formatNumber(value)),
  );
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    let positionPatch: readonly [number, number, number] | null = null;
    let rotationPatch: number | null = null;
    let scalePatch: readonly [number, number, number] | null = null;

    if (rule.move !== "none") {
      const parsed = position.map(parseNumber);
      if (parsed.some((value) => !Number.isFinite(value))) {
        setError("Escreve números nos eixos que queres mover.");
        return;
      }
      // Os eixos que a regra não permite vão buscar a posição atual: o motor ainda os recusa, mas
      // o pedido que sai daqui já diz a verdade sobre o que o utilizador pretendeu.
      positionPatch = [
        rule.move === "vertical"
          ? element.transform.position[0]
          : (parsed[0] ?? element.transform.position[0]),
        rule.move === "planar" ? element.transform.position[1] : (parsed[1] ?? element.transform.position[1]),
        rule.move === "vertical"
          ? element.transform.position[2]
          : (parsed[2] ?? element.transform.position[2]),
      ];
    }
    if (rule.rotate) {
      const parsed = parseNumber(rotation);
      if (!Number.isFinite(parsed)) {
        setError("A rotação tem de ser um número em graus.");
        return;
      }
      rotationPatch = parsed;
    }
    if (axes.length > 0) {
      const next: [number, number, number] = [1, 1, 1];
      for (const axis of axes) {
        const parsed = parseNumber(scale[axisIndex(axis)] ?? "1");
        if (!Number.isFinite(parsed)) {
          setError(`A escala do eixo ${axis.toUpperCase()} tem de ser um número.`);
          return;
        }
        next[axisIndex(axis)] = parsed;
      }
      scalePatch = next;
    }

    const patch: TransformPatch = {
      ...(positionPatch === null ? {} : { position: positionPatch }),
      ...(rotationPatch === null ? {} : { rotationYDeg: rotationPatch }),
      ...(scalePatch === null ? {} : { scale: scalePatch }),
    };
    const ok = store.applyTransform(element.id, patch);
    setApplied(ok);
    setError(ok ? null : rejected.join(" · ") || "A regra de edição recusou esta alteração.");
  };

  const rows = describeElement(element);

  return (
    <section className="surface-card grid gap-3 p-3" aria-labelledby="properties-heading">
      <div className="grid gap-0.5">
        <h2 id="properties-heading" className="text-2xs uppercase tracking-wide text-ink-muted">
          {ui.editor.propertiesLabel}
        </h2>
        <p className="text-sm leading-snug text-ink">{element.name}</p>
        <p className="text-2xs text-ink-muted">
          {categoryLabels[element.category]} · {MATERIALS[element.materialId].label}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-2xs">
        {rows
          .filter((row) => !["Posição", "Rotação"].includes(row.label))
          .map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="tabular text-ink-secondary">{row.value}</dd>
            </div>
          ))}
      </dl>

      {editable ? (
        <form className="grid gap-3" onSubmit={submit}>
          {rule.move !== "none" ? (
            <fieldset className="grid gap-2">
              <legend className="text-2xs uppercase tracking-wide text-ink-muted">
                {ui.editor.properties.position} · {ui.editor.properties.step(rule.snapM)}
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as const).map((axis) => {
                  const disabled =
                    (axis === "y" && rule.move === "planar") || (axis !== "y" && rule.move === "vertical");
                  const index = axisIndex(axis);
                  return (
                    <Field
                      key={axis}
                      id={`editor-position-${axis}`}
                      label={ui.editor.properties.axes[axis]}
                      className="grid gap-1"
                    >
                      {(attributes) => (
                        <input
                          {...attributes}
                          type="text"
                          inputMode="decimal"
                          disabled={disabled}
                          value={position[index] ?? "0"}
                          onChange={(event) =>
                            setPosition((current) =>
                              current.map((value, i) => (i === index ? event.target.value : value)),
                            )
                          }
                          className={cnControl(disabled)}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {rule.rotate ? (
            <Field
              id="editor-rotation"
              label={ui.editor.properties.rotation}
              hint={`${rule.snapDeg}° por passo`}
              className="grid gap-1"
            >
              {(attributes) => (
                <input
                  {...attributes}
                  type="text"
                  inputMode="decimal"
                  value={rotation}
                  onChange={(event) => setRotation(event.target.value)}
                  className={cnControl(false)}
                />
              )}
            </Field>
          ) : null}

          {axes.length > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="text-2xs uppercase tracking-wide text-ink-muted">
                {axes.length === 1 ? "Espessura (×)" : ui.editor.properties.scale}
              </legend>
              <div className={axes.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-3 gap-2"}>
                {axes.map((axis) => (
                  <Field
                    key={axis}
                    id={`editor-scale-${axis}`}
                    label={
                      axes.length === 1 ? ui.editor.properties.axes[axis] : ui.editor.properties.axes[axis]
                    }
                    hint={axes.length === 1 ? ui.editor.properties.thicknessNote : undefined}
                    className="grid gap-1"
                  >
                    {(attributes) => (
                      <input
                        {...attributes}
                        type="text"
                        inputMode="decimal"
                        value={scale[axisIndex(axis)] ?? "1"}
                        onChange={(event) =>
                          setScale((current) =>
                            current.map((value, i) => (i === axisIndex(axis) ? event.target.value : value)),
                          )
                        }
                        className={cnControl(false)}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="text-2xs text-ink-muted">
              {ui.editor.properties.locked} {rule.reason}
            </p>
          )}

          {error !== null ? (
            <Alert tone="warning" title="Alteração não aplicada">
              {error}
            </Alert>
          ) : applied && rejected.length > 0 ? (
            <Alert tone="info" title="Ajuste parcial">
              {rejected.map((reason) => ui.editor.rejected(reason)).join(" · ")}
            </Alert>
          ) : null}

          {materials.length > 0 ? (
            <Field
              id="editor-material"
              label={ui.editor.material.label}
              hint={ui.editor.material.hint}
              className="grid gap-1"
            >
              {(attributes) => (
                <select
                  {...attributes}
                  value={element.materialId}
                  onChange={(event) => {
                    const next = MATERIAL_IDS.find((id) => id === event.target.value);
                    if (next !== undefined) {
                      store.setMaterial(element.id, next);
                    }
                  }}
                  className={cnControl(false)}
                >
                  {materials.map((id) => (
                    <option key={id} value={id}>
                      {MATERIALS[id].label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : (
            <p className="text-2xs text-ink-muted">{ui.editor.material.none}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" variant="primary">
              {ui.editor.properties.apply}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => store.setElementVisibility(element.id, !element.visible)}
            >
              {element.visible ? ui.editor.tree.hideElement : ui.editor.tree.showElement}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => store.select(null)}>
              {ui.editor.selection.clear}
            </Button>
          </div>

          <p className="text-2xs text-ink-muted">
            {areaLabel(metrics.footprintM2)} de projeção · cota do topo {formatNumber(metrics.topElevationM)}{" "}
            m
          </p>
        </form>
      ) : (
        <div className="grid gap-2">
          <p className="text-2xs text-ink-muted">{rule.reason}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => store.setElementVisibility(element.id, !element.visible)}
          >
            {element.visible ? ui.editor.tree.hideElement : ui.editor.tree.showElement}
          </Button>
          <Button size="sm" variant="quiet" onClick={() => store.select(null)}>
            {ui.editor.selection.clear}
          </Button>
        </div>
      )}

      <p className="text-2xs text-ink-muted">{ui.editor.scope.body}</p>
    </section>
  );
}

function axisIndex(axis: "x" | "y" | "z"): number {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : "0";
}

/**
 * Campo de número em texto e não `type="number"`: um `pt-PT` escreve 3,45 com vírgula e o browser
 * rejeita esse valor no input numérico (fica vazio). Aqui a vírgula é aceite e o *snapping* do motor
 * faz o resto. Os limites de escala/deslocamento são os de `EDIT_LIMITS`, aplicados na escrita — a
 * UI não tem de ser a segunda autoridade sobre o mesmo número.
 */
function parseNumber(value: string): number {
  const normalized = value.trim().replace(",", ".");
  return normalized.length === 0 ? Number.NaN : Number(normalized);
}

function cnControl(disabled: boolean): string {
  return `${controlClass}${disabled ? " opacity-55" : ""}`;
}
