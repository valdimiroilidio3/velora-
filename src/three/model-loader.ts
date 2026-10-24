import { demoProjects, type DemoProject } from "@/demo/projects";
import { buildDemoDocument, type ModelDetail } from "./demo-building";
import { ModelLoadError, parseSceneDocument } from "./serialize";
import type { SceneDocument } from "./model";

/**
 * Fronteira de carregamento de geometria. É o único sítio da aplicação que decide **de onde**
 * vem um documento de cena; o viewport e a UI só conhecem `SceneDocument`.
 *
 * Duas origens implementadas (as duas que têm requisitos validados):
 *   · `demo` — gera o edifício de demonstração a partir do seed do projeto;
 *   · `document` — lê um documento VELORA exportado, com validação de contrato.
 *
 * `ifc`, `glb` e `plano` estão no tipo **como recusa explícita**: responder "formato ainda não
 * suportado" é uma fronteira real; fingir um parser aproximado seria o pior tipo de protótipo.
 */

export type ModelSource =
  | { readonly kind: "demo"; readonly projectSlug: string; readonly detail?: ModelDetail }
  | { readonly kind: "document"; readonly json: string }
  | { readonly kind: "ifc" | "glb" | "plan-image"; readonly label: string };

export interface LoadedModel {
  readonly document: SceneDocument;
  readonly source: "demo" | "document";
  readonly project?: DemoProject | undefined;
  readonly warnings: readonly string[];
}

export const UNSUPPORTED_FORMAT_MESSAGE =
  "Ainda não há importação de modelos externos neste produto: IFC, GLB e plantas imagem estão fora de âmbito (ver docs/ARCHITECTURE.md §8)." as const;

export function loadModel(source: ModelSource): LoadedModel {
  switch (source.kind) {
    case "demo": {
      const project = demoProjects.find((item) => item.slug === source.projectSlug);
      if (project === undefined) {
        throw new ModelLoadError("unknown_project", "Não há projeto de demonstração com essa referência.", [
          source.projectSlug,
        ]);
      }
      return {
        document: buildDemoDocument(project, { detail: source.detail ?? "full" }),
        source: "demo",
        project,
        warnings: [],
      };
    }
    case "document": {
      const document = parseSceneDocument(source.json);
      const warnings: string[] = [];
      if (document.elements.length < 10) {
        warnings.push("O documento tem poucos elementos: pode estar incompleto.");
      }
      if (document.orientationDeg !== 0) {
        warnings.push(`O edifício está orientado ${document.orientationDeg}° em relação ao norte do lote.`);
      }
      return { document, source: "document", warnings };
    }
    case "ifc":
    case "glb":
    case "plan-image":
      throw new ModelLoadError("unsupported_format", UNSUPPORTED_FORMAT_MESSAGE, [source.label]);
  }
}

/** Pré-visualização do que um projeto demo contém, sem construir documento (usada na lista). */
export function describeDemoModel(slug: string): string {
  const project = demoProjects.find((item) => item.slug === slug);
  if (project === undefined) {
    return "sem projeto";
  }
  return `${project.scene.floors} pisos · ${project.scene.bayWidthM} m de baia · ${project.city}`;
}
