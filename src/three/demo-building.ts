import type { DemoProject } from "@/demo/projects";
import { DEMO_NOTICE } from "@/demo/projects";
import type { MassingBox, MassingLevel } from "@/demo/massing";
import { buildMassing } from "@/demo/massing";
import type { MaterialId, SceneDocument, SceneElement, SceneLevel, Transform } from "./model";
import {
  degToRad,
  mm,
  rotateY,
  NORTH_AXIS,
  ORIGIN_DESCRIPTION,
  UNIT_CONVENTION_ID,
  UP_AXIS,
  type Vec3,
} from "./units";

/**
 * Gerador do edifício de demonstração: `Massing` (volumetria da Fase 2) → documento com elementos
 * por categoria, em metros reais vindos do seed. Não há números "de enfeite": tudo o que é
 * desenhado vem de `project.scene`.
 *
 * Decisão de modelação (a explicar na interface também): os vãos são **aberturas reais** — a
 * parede é gerada em montantes, resguardos e lintéis, e o vidro é um painel dentro do vão. Sem
 * CSG, sem bibliotecas, e com o interior visível através da janela, que é o comportamento de uma
 * maquete. Isto **não** é um modelo de execução: não há caixilharia, estanquidade, estrutura,
 * pré-fabricação nem regras construtivas.
 */

const SLAB_THICKNESS_M = 0.28;
const WALL_THICKNESS_M = 0.25;
const PARTITION_THICKNESS_M = 0.1;
const PANEL_THICKNESS_M = 0.06;
const WINDOW_HEIGHT_M = 1.35;
const WINDOW_SILL_M = 0.9;
const DOOR_HEIGHT_M = 2.1;
const DOOR_WIDTH_M = 1.1;
const PARAPET_HEIGHT_M = 0.9;
const PARAPET_THICKNESS_M = 0.15;
const TERRAIN_TOP_M = -0.35;
const PLATFORM_TOP_M = -0.05;
const TERRACE_MARGIN_M = 3;
const FURNITURE_GAP_M = 0.35;

export type ModelDetail = "full" | "compact";

export interface BuildModelOptions {
  readonly detail?: ModelDetail;
  /** Prefixo de id, para dois modelos poderem coexistir num teste sem colidir. */
  readonly idPrefix?: string | undefined;
}

/** Um alçado: linha no plano local X, com normal ao longo do eixo local Z. */
interface Facade {
  readonly side: "norte" | "sul" | "poente" | "nascente";
  readonly centerX: number;
  readonly centerZ: number;
  readonly lengthM: number;
  readonly rotationYDeg: number;
}

interface ElementDraft {
  readonly name: string;
  readonly category: SceneElement["category"];
  readonly levelId: string;
  readonly materialId: MaterialId;
  readonly geometry: SceneElement["geometry"];
  readonly transform: Transform;
  readonly generatedFrom: string;
  readonly note?: string | undefined;
  readonly locked?: boolean | undefined;
  readonly structural?: boolean | undefined;
}

/**
 * Converte coordenadas locais do alçado em posição de documento.
 * Rotação em torno de Y (+θ, anti-horário visto de cima): local X = (cos θ, 0, −sin θ),
 * local Z = (sin θ, 0, cos θ). É a mesma convenção que o renderer aplica ao `Object3D`.
 */
function place(run: Facade, localX: number, y: number, localZ = 0): Vec3 {
  const angle = degToRad(run.rotationYDeg);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    mm(run.centerX + localX * cos + localZ * sin),
    mm(y),
    mm(run.centerZ - localX * sin + localZ * cos),
  ];
}

function facadeRuns(box: MassingBox): Facade[] {
  const halfWidth = box.widthM / 2;
  const halfDepth = box.depthM / 2;
  return [
    { side: "norte", centerX: box.cx, centerZ: box.cz - halfDepth, lengthM: box.widthM, rotationYDeg: 0 },
    { side: "sul", centerX: box.cx, centerZ: box.cz + halfDepth, lengthM: box.widthM, rotationYDeg: 180 },
    { side: "poente", centerX: box.cx - halfWidth, centerZ: box.cz, lengthM: box.depthM, rotationYDeg: 90 },
    {
      side: "nascente",
      centerX: box.cx + halfWidth,
      centerZ: box.cz,
      lengthM: box.depthM,
      rotationYDeg: 270,
    },
  ];
}

function sequencer(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}.${String(next).padStart(2, "0")}`;
  };
}

function wallGeometry(lengthM: number, heightM: number, thicknessM = WALL_THICKNESS_M) {
  return {
    kind: "wall",
    lengthM: mm(Math.max(0.05, lengthM)),
    heightM: mm(Math.max(0.05, heightM)),
    thicknessM,
  } as const;
}

export function buildDemoDocument(project: DemoProject, options: BuildModelOptions = {}): SceneDocument {
  const detail = options.detail ?? "full";
  const full = detail === "full";
  const prefix = options.idPrefix ?? project.id;
  const massing = buildMassing(project.scene);
  const next = sequencer();
  const levels: SceneLevel[] = [];
  const elements: SceneElement[] = [];

  const halfExtentX = Math.max(
    ...massing.levels.flatMap((level) => level.boxes.map((box) => Math.abs(box.cx) + box.widthM / 2)),
  );
  const halfExtentZ = Math.max(
    ...massing.levels.flatMap((level) => level.boxes.map((box) => Math.abs(box.cz) + box.depthM / 2)),
  );
  const siteWidth = mm((halfExtentX + TERRACE_MARGIN_M) * 2);
  const siteDepth = mm((halfExtentZ + TERRACE_MARGIN_M) * 2);

  function push(draft: ElementDraft): void {
    elements.push({
      id: next(`${draft.levelId}.${draft.category}`),
      name: draft.name,
      category: draft.category,
      levelId: draft.levelId,
      materialId: draft.materialId,
      geometry: draft.geometry,
      transform: draft.transform,
      visible: true,
      locked: draft.locked ?? false,
      structural: draft.structural ?? false,
      demo: {
        generatedFrom: draft.generatedFrom,
        note: draft.note ?? "gerado a partir do seed de demonstração; sem valor de projeto",
      },
    });
  }

  function transform(position: Vec3, rotationYDeg = 0, scale: Vec3 = [1, 1, 1]): Transform {
    return {
      position: [mm(position[0]), mm(position[1]), mm(position[2])],
      rotationYDeg: mm(rotationYDeg),
      scale,
    };
  }

  // ── Terreno e plataforma ───────────────────────────────────────────────────
  levels.push({
    id: "site",
    index: -1,
    label: "Terreno e implantação",
    kind: "site",
    elevationM: TERRAIN_TOP_M,
    heightM: 0.3,
  });
  push({
    name: "Plano de referência do lote",
    category: "terrain",
    levelId: "site",
    materialId: "ground",
    geometry: { kind: "plate", widthM: siteWidth, depthM: siteDepth, thicknessM: 0.3 },
    transform: transform([0, TERRAIN_TOP_M - 0.15, 0]),
    locked: true,
    generatedFrom: "massing.siteRadiusM",
    note: "topo 35 cm abaixo do nível de pavimento do piso 0; é dele que partem todas as cotas",
  });
  push({
    name: "Plataforma e logradouro",
    category: "platform",
    levelId: "site",
    materialId: "platform",
    geometry: {
      kind: "plate",
      widthM: mm(siteWidth - TERRACE_MARGIN_M),
      depthM: mm(siteDepth - TERRACE_MARGIN_M),
      thicknessM: 0.3,
    },
    transform: transform([0, PLATFORM_TOP_M - 0.15, 0]),
    locked: true,
    generatedFrom: "construção + margem de 3 m",
  });

  // ── Pisos ──────────────────────────────────────────────────────────────────
  massing.levels.forEach((level: MassingLevel, levelIndex: number) => {
    const levelId = `L${String(levelIndex + 1).padStart(2, "0")}`;
    const isLast = levelIndex === massing.levels.length - 1;
    const floorY = level.elevationM;
    const wallHeight = mm(level.heightM - SLAB_THICKNESS_M);
    const wallBaseY = floorY;
    levels.push({
      id: levelId,
      index: levelIndex,
      label: level.kind === "podium" ? `Piso ${levelIndex + 1} · pódio` : `Piso ${levelIndex + 1}`,
      kind: level.kind,
      elevationM: floorY,
      heightM: level.heightM,
    });

    for (const box of level.boxes) {
      const boxLabel = level.boxes.length > 1 ? ` (${box.key})` : "";

      push({
        name: `Laje ${levelId}${boxLabel}`,
        category: "slab",
        levelId,
        materialId: "slab",
        geometry: { kind: "plate", widthM: box.widthM, depthM: box.depthM, thicknessM: SLAB_THICKNESS_M },
        transform: transform([box.cx, floorY - SLAB_THICKNESS_M / 2, box.cz]),
        structural: true,
        generatedFrom: `massing.levels[${levelIndex}].boxes.${box.key}`,
      });

      facadeRuns(box).forEach((run) => {
        // Aberturas só nos alçados Norte/Sul: é onde a modulação de bayas faz sentido de planta.
        const withOpenings = full && (run.side === "norte" || run.side === "sul");
        if (!withOpenings) {
          push({
            name: `Parede ${run.side}${boxLabel}`,
            category: "wall",
            levelId,
            materialId: "wall",
            geometry: wallGeometry(run.lengthM, wallHeight),
            transform: transform(place(run, 0, wallBaseY + wallHeight / 2)),
            structural: true,
            generatedFrom: `alçado ${run.side} do corpo ${box.key}`,
          });
          return;
        }

        const bays = Math.max(1, box.bays);
        const bayWidth = run.lengthM / bays;
        const pierWidth = mm(Math.min(0.6, bayWidth * 0.2));
        const openingWidth = mm(bayWidth - pierWidth);

        for (let index = 0; index <= bays; index += 1) {
          const localX =
            index === bays
              ? mm(run.lengthM / 2 - pierWidth / 2)
              : mm(-run.lengthM / 2 + pierWidth / 2 + index * bayWidth);
          push({
            name: `Montante ${index + 1} · ${run.side}${boxLabel}`,
            category: "wall",
            levelId,
            materialId: "wall",
            geometry: wallGeometry(pierWidth, wallHeight),
            transform: transform(place(run, localX, wallBaseY + wallHeight / 2)),
            structural: true,
            generatedFrom: "modulação de bayas",
          });
        }

        for (let bay = 0; bay < bays; bay += 1) {
          const localX = mm(-run.lengthM / 2 + bayWidth * (bay + 0.5));
          const isEntrance = levelIndex === 0 && run.side === "sul" && bay === Math.floor((bays - 1) / 2);
          const sillM = isEntrance ? 0 : WINDOW_SILL_M;
          const openingHeightM = isEntrance ? DOOR_HEIGHT_M : WINDOW_HEIGHT_M;
          const lintelHeightM = mm(wallHeight - sillM - openingHeightM);

          if (sillM > 0.05) {
            push({
              name: `Resguardo ${bay + 1} · ${run.side}${boxLabel}`,
              category: "wall",
              levelId,
              materialId: "wall",
              geometry: wallGeometry(openingWidth, sillM),
              transform: transform(place(run, localX, wallBaseY + sillM / 2)),
              structural: true,
              generatedFrom: "soleira do vão",
            });
          }
          if (lintelHeightM > 0.05) {
            push({
              name: `Lintel ${bay + 1} · ${run.side}${boxLabel}`,
              category: "wall",
              levelId,
              materialId: "wall",
              geometry: wallGeometry(openingWidth, lintelHeightM),
              transform: transform(
                place(run, localX, wallBaseY + sillM + openingHeightM + lintelHeightM / 2),
              ),
              structural: true,
              generatedFrom: "fecho superior do vão",
            });
          }

          push(
            isEntrance
              ? {
                  name: `Porta de entrada${boxLabel}`,
                  category: "door",
                  levelId,
                  materialId: "door",
                  geometry: {
                    kind: "panel",
                    widthM: Math.min(DOOR_WIDTH_M, openingWidth),
                    heightM: DOOR_HEIGHT_M,
                    thicknessM: PANEL_THICKNESS_M,
                  },
                  transform: transform(place(run, localX, wallBaseY + DOOR_HEIGHT_M / 2, 0)),
                  generatedFrom: "vão central do piso 0",
                  note: "porta de demonstração: sem ferragens, sem sentido de abertura, sem catálogos",
                }
              : {
                  name: `Vidro ${bay + 1} · ${run.side}${boxLabel}`,
                  category: "window",
                  levelId,
                  materialId: "glazing",
                  geometry: {
                    kind: "panel",
                    widthM: openingWidth,
                    heightM: openingHeightM,
                    thicknessM: PANEL_THICKNESS_M,
                  },
                  transform: transform(place(run, localX, wallBaseY + sillM + openingHeightM / 2, 0)),
                  generatedFrom: "vão de fachada por baia",
                  note: "painel vidrado a 5 cm do plano exterior; não há caixilharia nem sombreamento",
                },
          );
        }
      });

      if (full && box.bays > 1) {
        for (let bay = 1; bay < box.bays; bay += 1) {
          const offsetX = mm(-box.widthM / 2 + (box.widthM / box.bays) * bay);
          push({
            name: `Divisória ${bay}${boxLabel}`,
            category: "partition",
            levelId,
            materialId: "partition",
            geometry: wallGeometry(
              mm(box.depthM - WALL_THICKNESS_M * 2),
              mm(wallHeight - FURNITURE_GAP_M),
              PARTITION_THICKNESS_M,
            ),
            transform: transform(
              [box.cx + offsetX, wallBaseY + (wallHeight - FURNITURE_GAP_M) / 2, box.cz],
              90,
            ),
            generatedFrom: "modulação de bayas",
          });
        }
      }

      // Circulação vertical: um núcleo por corpo e por piso.
      const stairWidth = 1.25;
      const stairRun = mm(Math.min(3.4, box.depthM - WALL_THICKNESS_M * 2 - 0.4));
      push({
        name: `Escada ${levelId}${boxLabel}`,
        category: "circulation",
        levelId,
        materialId: "core",
        geometry: {
          kind: "stairs",
          widthM: stairWidth,
          runM: stairRun,
          riseM: mm(wallHeight),
          steps: full ? 15 : 4,
        },
        transform: transform([
          box.cx - box.widthM / 2 + stairWidth / 2 + WALL_THICKNESS_M + 0.4,
          wallBaseY + wallHeight / 2,
          box.cz,
        ]),
        structural: true,
        generatedFrom: "pé-direito do piso",
        note: "lance de volumetria: degraus representados para escala humana, não um cálculo de segurança",
      });

      if (full) {
        const furniture: readonly { name: string; size: Vec3; offset: Vec3 }[] = [
          { name: "Zona de estar", size: [2.1, 0.45, 0.95], offset: [0.9, 0.225, 0.6] },
          { name: "Mesa comum", size: [1.7, 0.74, 0.95], offset: [-0.9, 0.37, -0.7] },
        ];
        for (const item of furniture) {
          push({
            name: `${item.name}${boxLabel}`,
            category: "interior",
            levelId,
            materialId: "furniture",
            geometry: { kind: "box", size: item.size },
            transform: transform(
              [box.cx + item.offset[0], floorY + item.offset[1], box.cz + item.offset[2]],
              0,
            ),
            generatedFrom: "mobiliário de escala",
            note: "bloco de escala humana, sem catálogo, sem seleção de produto",
          });
        }
      }

      if (isLast) {
        const roofY = mm(floorY + level.heightM);
        push({
          name: `Laje de cobertura${boxLabel}`,
          category: "roof",
          levelId: "roof",
          materialId: "roof",
          geometry: {
            kind: "plate",
            widthM: mm(box.widthM + 0.3),
            depthM: mm(box.depthM + 0.3),
            thicknessM: 0.3,
          },
          transform: transform([box.cx, roofY + 0.15, box.cz]),
          structural: true,
          generatedFrom: "remate do último nível",
        });
        for (const run of facadeRuns({ ...box, widthM: box.widthM + 0.3, depthM: box.depthM + 0.3 })) {
          push({
            name: `Peitoril ${run.side}${boxLabel}`,
            category: "roof",
            levelId: "roof",
            materialId: "roof",
            geometry: wallGeometry(run.lengthM, PARAPET_HEIGHT_M, PARAPET_THICKNESS_M),
            transform: transform(place(run, 0, roofY + 0.3 + PARAPET_HEIGHT_M / 2)),
            generatedFrom: "remate de cobertura",
          });
        }
      }
    }
  });

  levels.push({
    id: "roof",
    index: massing.levels.length,
    label: "Cobertura",
    kind: "roof",
    elevationM: mm(massing.totalHeightM),
    heightM: mm(0.3 + PARAPET_HEIGHT_M),
  });

  // Orientação do edifício face ao norte do lote: os elementos do edifício rodam em torno da origem
  // (norte = −Z); terreno e plataforma são do lote e por isso **não** rodam.
  const oriented: SceneElement[] =
    project.scene.orientationDeg === 0
      ? elements
      : elements.map((item) =>
          item.category === "terrain" || item.category === "platform"
            ? item
            : {
                ...item,
                transform: {
                  ...item.transform,
                  position: rotateY(item.transform.position, project.scene.orientationDeg),
                  rotationYDeg: mm(item.transform.rotationYDeg + project.scene.orientationDeg),
                },
              },
        );

  return {
    schemaVersion: 1,
    id: `${prefix}.doc`,
    name: `${project.name} — maqueta volumétrica`,
    convention: UNIT_CONVENTION_ID,
    northAxis: NORTH_AXIS,
    upAxis: UP_AXIS,
    origin: ORIGIN_DESCRIPTION,
    orientationDeg: project.scene.orientationDeg,
    levels,
    elements: oriented,
    notice: DEMO_NOTICE,
  };
}

/** Constantes expostas para teste: a geometria do documento tem de bater certo com elas. */
export const MODEL_CONSTANTS = {
  slabThicknessM: SLAB_THICKNESS_M,
  wallThicknessM: WALL_THICKNESS_M,
  partitionThicknessM: PARTITION_THICKNESS_M,
  windowSillM: WINDOW_SILL_M,
  windowHeightM: WINDOW_HEIGHT_M,
  doorHeightM: DOOR_HEIGHT_M,
  parapetHeightM: PARAPET_HEIGHT_M,
  terrainTopM: TERRAIN_TOP_M,
  platformTopM: PLATFORM_TOP_M,
  terraceMarginM: TERRACE_MARGIN_M,
} as const;
