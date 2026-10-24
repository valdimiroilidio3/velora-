import type { ElementCategory, MaterialId, SceneElement } from "./model";
import { mm, type Vec3 } from "./units";

/**
 * Biblioteca de materiais — os **parâmetros**, não objetos Three.js.
 *
 * Vivem aqui por três razões: (1) o renderizador precisa de os construir e de os libertar com uma
 * chave estável; (2) o painel de propriedades e a legenda precisam de os nomear sem importar three;
 * (3) o `--scene-*` do design system tem de continuar a ser a origem da cor — um material que
 * defina `#cfcabf` à mão é a segunda paleta do projeto, e isso está proibido.
 *
 * São materiais PBR (`MeshStandardMaterial`) com valores contidos: rugosidades altas, metalidade
 * quase nula, e vidro tratada por transparência + `depthWrite: false` para não partir a ordenação.
 * Nada de mapas, nada de `envMap`, nada de pós-processamento.
 */

export interface MaterialParams {
  readonly id: MaterialId;
  readonly label: string;
  /** Nome do custom property em `globals.css` que fornece a cor base. */
  readonly colorToken: string;
  readonly fallbackColor: string;
  readonly roughness: number;
  readonly metalness: number;
  readonly opacity: number;
  /** `true` implica `depthWrite: false` no renderer — ver `engine/materials.ts`. */
  readonly transparent: boolean;
  readonly castShadow: boolean;
  readonly receiveShadow: boolean;
  readonly category: ElementCategory;
}

export const MATERIALS: Readonly<Record<MaterialId, MaterialParams>> = {
  ground: {
    id: "ground",
    label: "Terreno",
    colorToken: "--scene-ground",
    fallbackColor: "#d8d4cb",
    roughness: 0.98,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: false,
    receiveShadow: true,
    category: "terrain",
  },
  platform: {
    id: "platform",
    label: "Plataforma",
    colorToken: "--scene-podium",
    fallbackColor: "#c4bfb3",
    roughness: 0.94,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: false,
    receiveShadow: true,
    category: "platform",
  },
  slab: {
    id: "slab",
    label: "Béton de laje",
    colorToken: "--scene-mass-lit",
    fallbackColor: "#e2ded6",
    roughness: 0.9,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: true,
    receiveShadow: true,
    category: "slab",
  },
  wall: {
    id: "wall",
    label: "Fachada opaca",
    colorToken: "--scene-mass",
    fallbackColor: "#cfcabf",
    roughness: 0.88,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: true,
    receiveShadow: true,
    category: "wall",
  },
  partition: {
    id: "partition",
    label: "Divisória interior",
    colorToken: "--scene-line",
    fallbackColor: "#4c4a45",
    roughness: 0.92,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: false,
    receiveShadow: false,
    category: "partition",
  },
  door: {
    id: "door",
    label: "Porta",
    colorToken: "--scene-line",
    fallbackColor: "#4c4a45",
    roughness: 0.7,
    metalness: 0.05,
    opacity: 1,
    transparent: false,
    castShadow: false,
    receiveShadow: false,
    category: "door",
  },
  glazing: {
    id: "glazing",
    label: "Vidro",
    colorToken: "--scene-glazing",
    fallbackColor: "#6f7f80",
    roughness: 0.15,
    metalness: 0.1,
    opacity: 0.34,
    transparent: true,
    castShadow: false,
    receiveShadow: false,
    category: "window",
  },
  roof: {
    id: "roof",
    label: "Cobertura",
    colorToken: "--scene-mass",
    fallbackColor: "#cfcabf",
    roughness: 0.85,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: true,
    receiveShadow: true,
    category: "roof",
  },
  core: {
    id: "core",
    label: "Núcleo de circulação",
    colorToken: "--scene-mass-lit",
    fallbackColor: "#e2ded6",
    roughness: 0.8,
    metalness: 0,
    opacity: 1,
    transparent: false,
    castShadow: true,
    receiveShadow: true,
    category: "circulation",
  },
  furniture: {
    id: "furniture",
    label: "Mobiliário de escala",
    colorToken: "--scene-glazing",
    fallbackColor: "#6f7f80",
    roughness: 0.75,
    metalness: 0,
    opacity: 0.85,
    transparent: true,
    castShadow: false,
    receiveShadow: false,
    category: "interior",
  },
};

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export function materialFor(element: SceneElement): MaterialParams {
  return MATERIALS[element.materialId];
}

/** Realce de seleção: cor de acento do sistema, aplicada por `emissive` (não por material novo). */
export const SELECTION_EMISSIVE_TOKEN = "--accent";
export const HOVER_EMISSIVE_TOKEN = "--line-control";
export const SELECTION_EDGE_TOKEN = "--scene-line";

/** Limites do painel de propriedades — a UI não pode oferecer o que o motor recusa. */
export const EDIT_LIMITS = {
  /** Deslocamento máximo a partir da posição gerada, em metros. */
  maxOffsetM: 40,
  minScale: 0.5,
  maxScale: 2,
  maxRotationDeg: 360,
} as const;

export function clampOffset(origin: number, requested: number): number {
  const delta = requested - origin;
  const limited = Math.max(-EDIT_LIMITS.maxOffsetM, Math.min(EDIT_LIMITS.maxOffsetM, delta));
  return mm(origin + limited);
}

export function clampScale(value: number): number {
  return mm(Math.max(EDIT_LIMITS.minScale, Math.min(EDIT_LIMITS.maxScale, value)));
}

/** Passos de degrau de uma escada: usados pelo `mergeGeometries` do renderer. */
export function stairSteps(
  widthM: number,
  runM: number,
  riseM: number,
  steps: number,
): readonly { size: Vec3; offset: Vec3 }[] {
  const out: { size: Vec3; offset: Vec3 }[] = [];
  // Valores não finitos não chegam por JSON, mas chegam por aritmética de terceiros: um `NaN` a
  // passar por aqui produziria uma escada invisível e um plano com 0 primitivas. Duas é o mínimo.
  const requested = Number.isFinite(steps) ? Math.round(steps) : 2;
  const safeSteps = Math.max(2, Math.min(60, requested));
  const safeRun = Number.isFinite(runM) && runM > 0 ? runM : 0.1;
  const safeRise = Number.isFinite(riseM) && riseM > 0 ? riseM : 0.1;
  const tread = safeRun / safeSteps;
  const riser = safeRise / safeSteps;
  for (let index = 0; index < safeSteps; index += 1) {
    const height = riser * (index + 1);
    out.push({
      size: [mm(Number.isFinite(widthM) ? widthM : 1), mm(riser), mm(tread)],
      // Origem do elemento no centro do volume: cada degrau desloca-se em Z e sobe em Y.
      offset: [0, mm(-safeRise / 2 + height - riser / 2), mm(-safeRun / 2 + tread * (index + 0.5))],
    });
  }
  return out;
}
