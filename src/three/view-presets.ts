/**
 * Vistas pré-definidas, sem `three` à mistura.
 *
 * Porque um módulo próprio: a *label* de uma vista é texto de interface, e se ela viver no módulo
 * que constrói o `OrbitControls` então qualquer barra de ferramentas que a mostre arrasta 135 kB de
 * `three` para o *first-load* da rota — inclusive quando o dispositivo não tem WebGL. É uma
 * fronteira de *bundle*, não de estética: ver `src/three/boundary.test.ts`.
 */

export type ViewPreset = "perspetiva" | "superior" | "frontal" | "lateral";

export const VIEW_PRESETS: readonly { value: ViewPreset; label: string }[] = [
  { value: "perspetiva", label: "Perspetiva" },
  { value: "superior", label: "Vista superior" },
  { value: "frontal", label: "Alçado frontal" },
  { value: "lateral", label: "Alçado lateral" },
];

export const VIEW_PRESET_LABELS: Readonly<Record<ViewPreset, string>> = {
  perspetiva: "Perspetiva",
  superior: "Vista superior",
  frontal: "Alçado frontal",
  lateral: "Alçado lateral",
};
