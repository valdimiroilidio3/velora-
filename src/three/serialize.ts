import { z } from "zod";
import { ELEMENT_CATEGORIES, type SceneDocument, type SceneElement } from "./model";
import { UNIT_CONVENTION_ID } from "./units";

/**
 * Serialização do documento de cena — e o ponto de entrada honesto para "importar modelos".
 *
 * O que existe: JSON versionado, validado por schema, com **rejeição explícita** de convenção de
 * unidades diferente e de categorias desconhecidas. É este o contrato que a Fase 4 usará para
 * persistir; hoje serve para exportar/importar localmente o estado do editor.
 *
 * O que **não** existe (e o tipo diz-lo): importação de IFC/GLB/planos, geometria não paramétrica,
 * regras construtivas. Um `format: "ifc"` devolve `unsupported_format`, não um parser aproximado.
 * Nenhuma alegação de conformidade BIM ou compatibilidade IFC é feita em lado nenhum do produto.
 */

export const SCENE_EXPORT_FORMAT = "velora.scene-document" as const;
export const SCENE_EXPORT_VERSION = 1 as const;

const vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const positive = z.number().finite().positive().max(2000);

const geometrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("box"), size: vec3.refine((value) => value.every((n) => n > 0 && n <= 2000)) }),
  z.object({
    kind: z.literal("wall"),
    lengthM: positive,
    heightM: positive,
    thicknessM: positive,
  }),
  z.object({ kind: z.literal("plate"), widthM: positive, depthM: positive, thicknessM: positive }),
  z.object({ kind: z.literal("panel"), widthM: positive, heightM: positive, thicknessM: positive }),
  z.object({
    kind: z.literal("stairs"),
    widthM: positive,
    runM: positive,
    riseM: positive,
    steps: z.number().int().min(2).max(60),
  }),
]);

const elementSchema = z.object({
  id: z.string().min(3).max(120),
  name: z.string().min(1).max(160),
  category: z.enum(ELEMENT_CATEGORIES as [SceneElement["category"], ...SceneElement["category"][]]),
  levelId: z.string().min(1).max(40),
  materialId: z.enum([
    "ground",
    "platform",
    "slab",
    "wall",
    "partition",
    "door",
    "glazing",
    "roof",
    "core",
    "furniture",
  ]),
  geometry: geometrySchema,
  transform: z.object({
    position: vec3,
    rotationYDeg: z.number().finite().min(-3600).max(3600),
    scale: vec3.refine((value) => value.every((n) => n > 0 && n <= 10)),
  }),
  visible: z.boolean(),
  locked: z.boolean(),
  structural: z.boolean(),
  demo: z.object({ generatedFrom: z.string().min(1), note: z.string().min(1) }),
});

export const sceneDocumentSchema = z.object({
  schemaVersion: z.literal(SCENE_EXPORT_VERSION),
  id: z.string().min(3).max(120),
  name: z.string().min(1).max(200),
  convention: z.literal(UNIT_CONVENTION_ID),
  northAxis: z.literal("-Z"),
  upAxis: z.literal("Y"),
  origin: z.string().min(3),
  orientationDeg: z.number().finite().min(-360).max(360),
  levels: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        index: z.number().int().min(-1).max(200),
        label: z.string().min(1).max(80),
        kind: z.enum(["site", "podium", "typical", "setback", "roof"]),
        elevationM: z.number().finite(),
        heightM: z.number().finite().min(0),
      }),
    )
    .min(1),
  elements: z.array(elementSchema).min(1).max(20_000),
  notice: z.string().min(10),
});

export type SceneExport = z.infer<typeof sceneDocumentSchema>;

export type ModelLoadErrorCode =
  "malformed_json" | "schema_invalid" | "convention_mismatch" | "unsupported_format" | "unknown_project";

export class ModelLoadError extends Error {
  readonly code: ModelLoadErrorCode;
  readonly details: readonly string[];

  constructor(code: ModelLoadErrorCode, message: string, details: readonly string[] = []) {
    super(message);
    this.name = "ModelLoadError";
    this.code = code;
    this.details = details;
  }
}

export interface ExportedDocument {
  readonly format: typeof SCENE_EXPORT_FORMAT;
  readonly version: typeof SCENE_EXPORT_VERSION;
  readonly exportedAt: string;
  readonly document: SceneExport;
}

export function serializeSceneDocument(
  document: SceneDocument,
  exportedAt = new Date().toISOString(),
): string {
  const payload: ExportedDocument = {
    format: SCENE_EXPORT_FORMAT,
    version: SCENE_EXPORT_VERSION,
    exportedAt,
    document: document as unknown as SceneExport,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Aceita o envelope `{format, version, document}` e devolve o documento validado.
 * Erros são tipados e legíveis por utilizador — nunca um `throw` cru de parsing.
 */
export function parseSceneDocument(text: string): SceneDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ModelLoadError("malformed_json", "O ficheiro não é JSON válido.");
  }

  const envelope = parsed as Partial<ExportedDocument> | null;
  if (envelope === null || typeof envelope !== "object") {
    throw new ModelLoadError("schema_invalid", "O ficheiro não tem estrutura de documento de cena.");
  }
  if (envelope.format !== SCENE_EXPORT_FORMAT || envelope.version !== SCENE_EXPORT_VERSION) {
    throw new ModelLoadError("unsupported_format", "Este ficheiro não é um documento de cena VELORA v1.", [
      `format=${String(envelope.format)}`,
      `version=${String(envelope.version)}`,
    ]);
  }

  const result = sceneDocumentSchema.safeParse(envelope.document);
  if (!result.success) {
    throw new ModelLoadError(
      "schema_invalid",
      "O documento de cena não passou na validação do contrato.",
      result.error.issues.slice(0, 12).map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }
  if (result.data.convention !== UNIT_CONVENTION_ID) {
    throw new ModelLoadError(
      "convention_mismatch",
      "A convenção de unidades do ficheiro não corresponde à do motor.",
    );
  }

  const ids = new Set<string>();
  for (const element of result.data.elements) {
    if (ids.has(element.id)) {
      throw new ModelLoadError("schema_invalid", `Identificador repetido: ${element.id}.`);
    }
    ids.add(element.id);
  }
  const levelIds = new Set(result.data.levels.map((level) => level.id));
  const orphan = result.data.elements
    .filter((element) => !levelIds.has(element.levelId))
    .map((element) => element.id);
  if (orphan.length > 0) {
    throw new ModelLoadError(
      "schema_invalid",
      "Há elementos sem piso correspondente no documento.",
      orphan.slice(0, 6),
    );
  }

  return result.data as unknown as SceneDocument;
}

export function isSceneCategory(value: string): value is SceneElement["category"] {
  return (ELEMENT_CATEGORIES as readonly string[]).includes(value);
}
