import type { SceneSeed } from "./projects";

/**
 * Projeção determinística dos dados de demonstração em volumes construtivos.
 *
 * É a peça que mantém as duas representações coerentes: o desenho SVG (planta
 * esquemática e alternativa acessível) e a cena WebGL consomem exatamente esta
 * estrutura. Nada aqui sabe o que é React, Three.js ou DOM.
 *
 * NÃO é um modelo BIM: são caixas com alturas de piso e recuos, sem paredes,
 * vãos, materiais construtivos nem regras. Ver docs/ARCHITECTURE.md §8.
 */

export interface MassingBox {
  readonly key: string;
  /** Centro em X/Z, no plano do terreno (metros). */
  readonly cx: number;
  readonly cz: number;
  readonly widthM: number;
  readonly depthM: number;
  /** N.º de vãos de fachada, para desenhar a modulação. */
  readonly bays: number;
}

export interface MassingLevel {
  readonly index: number;
  readonly elevationM: number;
  readonly heightM: number;
  readonly kind: "podium" | "typical" | "setback";
  readonly boxes: readonly MassingBox[];
}

export interface Massing {
  readonly levels: readonly MassingLevel[];
  readonly totalHeightM: number;
  readonly siteRadiusM: number;
  readonly orientationDeg: number;
  readonly bayWidthM: number;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function boxCountForWings(wings: number): number {
  if (wings <= 1) {
    return 1;
  }
  if (wings === 2) {
    return 2;
  }
  if (wings === 3) {
    return 3;
  }
  if (wings <= 5) {
    return 4;
  }
  return Math.min(wings, 6);
}

function layout(wings: number, bayWidthM: number, depthM: number, courtyardWidthM: number): MassingBox[] {
  const count = boxCountForWings(wings);
  const boxes: MassingBox[] = [];

  if (count === 1) {
    boxes.push({ key: "b0", cx: 0, cz: 0, widthM: round(bayWidthM * 3), depthM, bays: 3 });
    return boxes;
  }
  if (count === 2) {
    const width = round(bayWidthM * 3);
    const offset = round(courtyardWidthM / 2 + width / 2);
    boxes.push({ key: "b0", cx: -offset, cz: 0, widthM: width, depthM, bays: 3 });
    boxes.push({ key: "b1", cx: offset, cz: 0, widthM: width, depthM, bays: 3 });
    return boxes;
  }
  if (count === 3) {
    // U em volta do pátio: barra de fundo + duas alas laterais.
    const backWidth = round(bayWidthM * 4);
    const sideDepth = round(depthM * 1.6);
    const offset = round(courtyardWidthM / 2 + backWidth / 2);
    boxes.push({
      key: "back",
      cx: 0,
      cz: -round(courtyardWidthM / 2 + depthM / 2),
      widthM: backWidth,
      depthM,
      bays: 4,
    });
    boxes.push({
      key: "west",
      cx: -offset,
      cz: round(sideDepth / 4),
      widthM: depthM,
      depthM: sideDepth,
      bays: 2,
    });
    boxes.push({
      key: "east",
      cx: offset,
      cz: round(sideDepth / 4),
      widthM: depthM,
      depthM: sideDepth,
      bays: 2,
    });
    return boxes;
  }
  if (count === 4) {
    // Anel em volta do pátio.
    const along = round(bayWidthM * 4);
    const across = round(depthM);
    const gap = courtyardWidthM;
    boxes.push({ key: "north", cx: 0, cz: -(across / 2 + gap / 2), widthM: along, depthM: across, bays: 4 });
    boxes.push({ key: "south", cx: 0, cz: across / 2 + gap / 2, widthM: along, depthM: across, bays: 4 });
    boxes.push({ key: "west", cx: -(along / 2 + gap / 2), cz: 0, widthM: across, depthM: along, bays: 2 });
    boxes.push({ key: "east", cx: along / 2 + gap / 2, cz: 0, widthM: across, depthM: along, bays: 2 });
    return boxes;
  }
  // Banda linear de 6 corpos (moradias geminadas).
  const width = round(bayWidthM * 1.6);
  const step = width + 0.2;
  for (let index = 0; index < 6; index += 1) {
    const cx = round((index - 2.5) * step);
    boxes.push({ key: `band-${index}`, cx, cz: 0, widthM: width, depthM, bays: 2 });
  }
  return boxes;
}

export function buildMassing(seed: SceneSeed): Massing {
  const podium = Math.max(0, Math.min(seed.podiumFloors, seed.floors - 1));
  const setback = Math.max(0, Math.min(seed.setbackFloors, seed.floors - podium - 1));
  const baseBoxes = layout(seed.wings, seed.bayWidthM, seed.depthM, seed.courtyardWidthM);

  const levels: MassingLevel[] = [];
  let maximumHalfExtent = 0;

  for (let index = 0; index < seed.floors; index += 1) {
    const isPodium = index < podium;
    const isSetback = index >= seed.floors - setback;
    const boxes = baseBoxes.map((item) => {
      if (isPodium) {
        // O pódio estende-se no sentido da frente e ocupa a profundidade do lote.
        return {
          ...item,
          cx: 0,
          cz: 0,
          widthM: round(Math.abs(item.cx) * 2 + item.widthM + (isPodium ? 2 : 0)),
          depthM: round(item.depthM + (isSetback ? 0 : 2)),
          bays: Math.max(2, item.bays),
        } satisfies MassingBox;
      }
      if (!isSetback) {
        return item;
      }
      const inset = seed.setbackInsetM;
      return {
        ...item,
        widthM: Math.max(2, round(item.widthM - inset)),
        depthM: Math.max(2, round(item.depthM - inset)),
        bays: Math.max(1, round(Math.max(2, item.widthM - inset) / seed.bayWidthM || 1)),
      } satisfies MassingBox;
    });

    // Num pódio contínuo, os corpos sobrepostos fundem-se numa única barra.
    const collapsed = isPodium ? [boxes[0] ?? baseBoxes[0]!] : boxes;

    for (const item of collapsed) {
      maximumHalfExtent = Math.max(
        maximumHalfExtent,
        Math.abs(item.cx) + item.widthM / 2,
        Math.abs(item.cz) + item.depthM / 2,
      );
    }

    levels.push({
      index,
      elevationM: round(index * seed.floorHeightM),
      heightM: seed.floorHeightM,
      kind: isPodium ? "podium" : isSetback ? "setback" : "typical",
      boxes: collapsed,
    });
  }

  return {
    levels,
    totalHeightM: round(seed.floors * seed.floorHeightM),
    siteRadiusM: round(maximumHalfExtent + 8),
    orientationDeg: seed.orientationDeg,
    bayWidthM: seed.bayWidthM,
  };
}

/** Contornos por piso em coordenadas de planta (x → direita, y → "para cima" no desenho). */
export interface PlanLevel {
  readonly index: number;
  readonly kind: MassingLevel["kind"];
  readonly rects: readonly PlanRect[];
}

export interface PlanRect {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly depth: number;
  readonly bays: number;
}

export function toPlanLevels(massing: Massing): PlanLevel[] {
  return massing.levels.map((level) => ({
    index: level.index,
    kind: level.kind,
    rects: level.boxes.map((item) => ({
      key: item.key,
      x: round(item.cx - item.widthM / 2),
      y: round(item.cz - item.depthM / 2),
      width: item.widthM,
      depth: item.depthM,
      bays: item.bays,
    })),
  }));
}

export function levelSummary(massing: Massing): { total: number; podium: number; setback: number } {
  return {
    total: massing.levels.length,
    podium: massing.levels.filter((level) => level.kind === "podium").length,
    setback: massing.levels.filter((level) => level.kind === "setback").length,
  };
}
