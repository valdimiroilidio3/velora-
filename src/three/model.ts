import { resolveTransform } from "./edit-rules";
import { canWear, MATERIALS, materialRefusalReason } from "./materials";
import { areaLabel, dimensionLabel, mm, normalizeDegrees, volumeLabel, type Vec3 } from "./units";
// Estas três são usadas só em posição de tipo (`typeof`), por isso entram como import de tipo.
import type { NORTH_AXIS, UNIT_CONVENTION_ID, UP_AXIS } from "./units";

/**
 * Modelo de domínio da cena. É a **fonte de verdade**: o viewport é uma projeção deste documento,
 * e nunca o contrário. Nenhum objeto Three.js vive aqui — isto tem de poder correr em Node,
 * ser serializado e ser testado sem browser.
 *
 * Continua a **não ser um modelo BIM**: não há regras construtivas, famílias, materiais reais,
 * quantidades para orçamento nem identificação IFC. As categorias servem a leitura espacial e a
 * edição local (`docs/ARCHITECTURE.md` §8).
 */

export type ElementCategory =
  | "terrain"
  | "platform"
  | "slab"
  | "wall"
  | "partition"
  | "door"
  | "window"
  | "roof"
  | "circulation"
  | "interior";

export const ELEMENT_CATEGORIES: readonly ElementCategory[] = [
  "terrain",
  "platform",
  "slab",
  "wall",
  "partition",
  "door",
  "window",
  "roof",
  "circulation",
  "interior",
];

/** Rótulos PT partilhados pela árvore, pelo painel e pela legenda do viewport. */
export const categoryLabels: Readonly<Record<ElementCategory, string>> = {
  terrain: "Terreno",
  platform: "Plataforma",
  slab: "Lajes",
  wall: "Paredes exteriores",
  partition: "Divisórias",
  door: "Portas",
  window: "Janelas",
  roof: "Cobertura",
  circulation: "Circulação vertical",
  interior: "Interior",
};

export type MaterialId =
  "ground" | "platform" | "slab" | "wall" | "partition" | "door" | "glazing" | "roof" | "core" | "furniture";

export type GeometrySpec =
  | { readonly kind: "box"; readonly size: Vec3 }
  /** Parede: comprimento ao longo do eixo local X, espessura em Z. */
  | { readonly kind: "wall"; readonly lengthM: number; readonly heightM: number; readonly thicknessM: number }
  /** Laje/plateia: dimensão horizontal + espessura vertical. */
  | { readonly kind: "plate"; readonly widthM: number; readonly depthM: number; readonly thicknessM: number }
  /** Painel de vão (porta/janela) encostado à face exterior da parede. */
  | { readonly kind: "panel"; readonly widthM: number; readonly heightM: number; readonly thicknessM: number }
  /** Lanço de escadas com degraus reais (a renderização produz `steps` caixas). */
  | {
      readonly kind: "stairs";
      readonly widthM: number;
      readonly runM: number;
      readonly riseM: number;
      readonly steps: number;
    };

export interface Transform {
  /** Cota em metros, no eixo do documento (Y para cima). */
  readonly position: Vec3;
  /** Rotação em torno de Y, em graus, sentido anti-horário visto de cima. */
  readonly rotationYDeg: number;
  /** Escala por eixo; 1 = dimensão nominal da geometria. */
  readonly scale: Vec3;
}

export interface SceneElement {
  /** Estável e legível: `${levelId}.${category}.${n}` — não é um id aleatório. */
  readonly id: string;
  readonly name: string;
  readonly category: ElementCategory;
  readonly levelId: string;
  readonly materialId: MaterialId;
  readonly geometry: GeometrySpec;
  readonly transform: Transform;
  readonly visible: boolean;
  /** Elementos bloqueados não aceitam nenhuma ferramenta (terreno, plataforma). */
  readonly locked: boolean;
  /** Estrutural: usado pelas regras de edição para recusar escala de paredes de fachada. */
  readonly structural: boolean;
  readonly demo: { readonly generatedFrom: string; readonly note: string };
}

export type LevelKind = "site" | "podium" | "typical" | "setback" | "roof";

export interface SceneLevel {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly kind: LevelKind;
  readonly elevationM: number;
  readonly heightM: number;
}

export interface SceneDocument {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly convention: typeof UNIT_CONVENTION_ID;
  readonly northAxis: typeof NORTH_AXIS;
  readonly upAxis: typeof UP_AXIS;
  /** Descrição da origem espacial; o valor canónico é `ORIGIN_DESCRIPTION` de `units.ts`. */
  readonly origin: string;
  readonly orientationDeg: number;
  readonly levels: readonly SceneLevel[];
  readonly elements: readonly SceneElement[];
  /** Aviso de natureza do dado, transportado no próprio documento. */
  readonly notice: string;
}

/** Dimensões nominais (antes da escala) de qualquer geometria, em metros. */
export function nominalSize(geometry: GeometrySpec): Vec3 {
  switch (geometry.kind) {
    case "box":
      return geometry.size;
    case "wall":
      return [geometry.lengthM, geometry.heightM, geometry.thicknessM];
    case "plate":
      return [geometry.widthM, geometry.thicknessM, geometry.depthM];
    case "panel":
      return [geometry.widthM, geometry.heightM, geometry.thicknessM];
    case "stairs":
      return [geometry.widthM, geometry.riseM, geometry.runM];
  }
}

/** Dimensões efetivas = nominal × escala, arredondadas ao milímetro. */
export function elementDimensions(element: SceneElement): Vec3 {
  const nominal = nominalSize(element.geometry);
  return [
    mm(nominal[0] * element.transform.scale[0]),
    mm(nominal[1] * element.transform.scale[1]),
    mm(nominal[2] * element.transform.scale[2]),
  ];
}

export interface ElementMetrics {
  readonly footprintM2: number;
  readonly volumeM3: number;
  readonly topElevationM: number;
}

/** Métricas derivadas — a apresentação nunca faz esta conta em separado. */
export function elementMetrics(element: SceneElement): ElementMetrics {
  const [width, height, depth] = elementDimensions(element);
  // Projeção: para lajes e escadas é a área horizontal; para paredes e painéis é a área de alçado.
  const horizontal = element.geometry.kind === "plate" || element.geometry.kind === "stairs";
  return {
    footprintM2: mm(horizontal ? width * depth : Math.max(width, depth) * height),
    volumeM3: mm(width * height * depth),
    topElevationM: mm(element.transform.position[1] + height / 2),
  };
}

/** Linhas do painel de propriedades: texto pronto, unidades incluídas. */
export function describeElement(element: SceneElement): readonly { label: string; value: string }[] {
  const metrics = elementMetrics(element);
  return [
    { label: "Identificador", value: element.id },
    { label: "Categoria", value: categoryLabels[element.category] },
    { label: "Piso", value: element.levelId },
    { label: "Geometria", value: element.geometry.kind },
    { label: "Dimensões", value: dimensionLabel(elementDimensions(element)) },
    {
      label: "Posição",
      value: element.transform.position.map((v) => mm(v).toFixed(2).replace(".", ",")).join(", ") + " m",
    },
    { label: "Rotação", value: `${normalizeDegrees(element.transform.rotationYDeg)}°` },
    { label: "Cota do topo", value: `${mm(metrics.topElevationM)} m` },
    { label: "Área de projeção", value: areaLabel(metrics.footprintM2) },
    { label: "Volume", value: volumeLabel(metrics.volumeM3) },
    { label: "Material", value: element.materialId },
    { label: "Estado", value: element.locked ? "bloqueado" : element.visible ? "visível" : "oculto" },
  ];
}

export function elementById(document: SceneDocument, id: string | null): SceneElement | undefined {
  if (id === null) {
    return undefined;
  }
  return document.elements.find((element) => element.id === id);
}

export function replaceElement(document: SceneDocument, element: SceneElement): SceneDocument {
  return {
    ...document,
    elements: document.elements.map((current) => (current.id === element.id ? element : current)),
  };
}

export interface TransformPatch {
  readonly position?: Partial<readonly [number?, number?, number?]> | undefined;
  readonly rotationYDeg?: number | undefined;
  readonly scale?: readonly [number?, number?, number?] | undefined;
}

export interface TransformResult {
  readonly document: SceneDocument;
  readonly applied: boolean;
  /** Eixos/ferramentas recusados pelas regras de edição, para a interface os nomear. */
  readonly rejected: readonly string[];
}

/**
 * Única porta de escrita de transformações: valida pelas regras de `edit-rules` antes de copiar
 * para o documento. Assim, quer o viewport (gizmo), quer o painel (campos numéricos), quer um
 * teste passem pelo mesmo crivo — e uma recusa é um resultado, não uma exceção silenciosa.
 */
export function withTransform(document: SceneDocument, id: string, patch: TransformPatch): TransformResult {
  const element = elementById(document, id);
  if (element === undefined) {
    return { document, applied: false, rejected: ["elemento inexistente"] };
  }
  if (element.locked) {
    return { document, applied: false, rejected: ["elemento bloqueado"] };
  }
  const { transform, rejected } = resolveTransform(element, patch);
  const unchanged =
    transform.position === element.transform.position &&
    transform.rotationYDeg === element.transform.rotationYDeg &&
    transform.scale === element.transform.scale;
  if (unchanged) {
    return { document, applied: false, rejected };
  }
  return { document: replaceElement(document, { ...element, transform }), applied: true, rejected };
}

export function withVisibility(document: SceneDocument, id: string, visible: boolean): SceneDocument {
  const element = elementById(document, id);
  return element === undefined ? document : replaceElement(document, { ...element, visible });
}

/** Alternar visibilidade de uma categoria inteira (usado pela árvore e pelo modo "só este piso"). */
export function withCategoryVisibility(
  document: SceneDocument,
  category: ElementCategory,
  visible: boolean,
  levelId?: string,
): SceneDocument {
  return {
    ...document,
    elements: document.elements.map((element) =>
      element.category === category && (levelId === undefined || element.levelId === levelId)
        ? { ...element, visible }
        : element,
    ),
  };
}

export function visibleElements(document: SceneDocument): SceneElement[] {
  return document.elements.filter((element) => element.visible);
}

export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly center: Vec3;
  readonly radius: number;
}

/** AABB do documento (sem rotação por elemento: conservador e suficiente para enquadramento). */
export function documentBounds(document: SceneDocument, onlyVisible = true): Bounds {
  const items = onlyVisible ? visibleElements(document) : [...document.elements];
  if (items.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 10 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const element of items) {
    const [px, py, pz] = element.transform.position;
    const [w, h, d] = elementDimensions(element);
    // Meia-diagonal no plano: cobre o pior caso de um elemento rodado 45°.
    const halfPlan = Math.hypot(w, d) / 2;
    minX = Math.min(minX, px - halfPlan);
    maxX = Math.max(maxX, px + halfPlan);
    minY = Math.min(minY, py - h / 2);
    maxY = Math.max(maxY, py + h / 2);
    minZ = Math.min(minZ, pz - halfPlan);
    maxZ = Math.max(maxZ, pz + halfPlan);
  }
  const center: Vec3 = [mm((minX + maxX) / 2), mm((minY + maxY) / 2), mm((minZ + maxZ) / 2)];
  const radius = mm(Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2);

  return {
    min: [minX, minY, minZ] as Vec3,
    max: [maxX, maxY, maxZ] as Vec3,
    center,
    radius: Math.max(radius, 1),
  };
}

export interface MaterialResult {
  readonly document: SceneDocument;
  readonly applied: boolean;
  /** Motivo legível quando a troca foi recusada (categoria bloqueada ou material incompatível). */
  readonly rejected: readonly string[];
}

/**
 * Trocar o acabamento de um elemento (`Fase 4`) — a única edição que não mexe em geometria: o
 * `RenderPlan` muda a chave de material, o `SceneManager` troca a referência no `Mesh`, e nem a
 * geometria nem a seleção são reconstruídas.
 */
export function withMaterial(document: SceneDocument, id: string, materialId: MaterialId): MaterialResult {
  const element = elementById(document, id);
  if (element === undefined) {
    return { document, applied: false, rejected: ["elemento inexistente"] };
  }
  if (element.locked) {
    return { document, applied: false, rejected: [materialRefusalReason(element.category)] };
  }
  if (!canWear(materialId, element.category)) {
    return {
      document,
      applied: false,
      rejected: [
        `O ${MATERIALS[materialId].label.toLowerCase()} não se aplica a ${categoryLabels[element.category].toLowerCase()}.`,
      ],
    };
  }
  if (element.materialId === materialId) {
    return { document, applied: false, rejected: [] };
  }
  return { document: replaceElement(document, { ...element, materialId }), applied: true, rejected: [] };
}
