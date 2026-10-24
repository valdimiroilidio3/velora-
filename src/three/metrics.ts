import { elementDimensions, type SceneDocument, type SceneElement } from "./model";

/**
 * Métricas de render **estimadas a partir do documento** — porque este ambiente não tem browser
 * nem GPU, e uma promessa de FPS sem medição seria desonesta (ver `docs/QUALITY-GATES.md` QG-19).
 *
 * A estimação é suficiente para orçamentar: cada elemento é uma malha com um `BufferGeometry`
 * próprio (exceto escadas, que são fundidas num só). O HUD mostra estes números **e** os números
 * medidos pelo `renderer.info`, lado a lado, para que a diferença se veja.
 */

/** Caixa: 6 faces × 2 triângulos. */
export const TRIANGLES_PER_BOX = 12;
/** Orçamento herdado de `docs/ARCHITECTURE.md` §8. */
export const PERFORMANCE_BUDGET = {
  maxTriangles: 1_500_000,
  maxDrawCalls: 1_500,
  maxElements: 3_000,
} as const;

export interface RenderEstimate {
  readonly elements: number;
  readonly primitives: number;
  readonly triangles: number;
  readonly drawCalls: number;
  readonly materials: number;
  readonly volumesM3: number;
}

function primitivesFor(element: SceneElement): number {
  return element.geometry.kind === "stairs" ? Math.max(1, element.geometry.steps) : 1;
}

export function estimateDocumentMetrics(
  document: SceneDocument,
  options: { readonly onlyVisible?: boolean } = {},
): RenderEstimate {
  const onlyVisible = options.onlyVisible ?? true;
  const materials = new Set<string>();
  let elements = 0;
  let primitives = 0;
  let volumes = 0;

  for (const element of document.elements) {
    if (onlyVisible && !element.visible) {
      continue;
    }
    elements += 1;
    primitives += primitivesFor(element);
    materials.add(element.materialId);
    const [width, height, depth] = elementDimensions(element);
    volumes += width * height * depth;
  }

  return {
    elements,
    primitives,
    triangles: primitives * TRIANGLES_PER_BOX,
    // Um material diferente por malha não multiplica draws (são meshes separados), mas conta para
    // o estado de GPU: é o número que interessa para o orçamento de troca de material.
    drawCalls: elements,
    materials: materials.size,
    volumesM3: Math.round(volumes * 10) / 10,
  };
}

export interface BudgetCheck {
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export function checkPerformanceBudget(estimate: RenderEstimate): BudgetCheck {
  const violations: string[] = [];
  if (estimate.triangles > PERFORMANCE_BUDGET.maxTriangles) {
    violations.push(`triângulos ${estimate.triangles} acima do limite ${PERFORMANCE_BUDGET.maxTriangles}`);
  }
  if (estimate.drawCalls > PERFORMANCE_BUDGET.maxDrawCalls) {
    violations.push(`draw calls ${estimate.drawCalls} acima do limite ${PERFORMANCE_BUDGET.maxDrawCalls}`);
  }
  if (estimate.elements > PERFORMANCE_BUDGET.maxElements) {
    violations.push(`elementos ${estimate.elements} acima do limite ${PERFORMANCE_BUDGET.maxElements}`);
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Estratégia adaptativa (a regra, não uma adivinhação): quando a estimativa passa um limiar,
 * o editor degrada por esta ordem, e diz-o na interface.
 */
export interface QualityPlan {
  readonly detail: "full" | "compact";
  readonly shadows: boolean;
  readonly antialias: boolean;
  readonly maxPixelRatio: number;
  readonly steps: readonly string[];
}

export function planQuality(input: {
  readonly estimate: RenderEstimate;
  readonly constrained: boolean;
  readonly reducedMotion: boolean;
}): QualityPlan {
  const steps: string[] = [];
  const crowded = input.estimate.elements > 600;
  const detail: QualityPlan["detail"] = input.constrained || crowded ? "compact" : "full";
  if (detail === "compact") {
    steps.push("geometria de detalhe removida (divisórias, mobiliário, vidros)");
  }
  const shadows = !input.constrained && !crowded;
  if (!shadows) {
    steps.push("sombras desligadas");
  }
  const maxPixelRatio = input.constrained ? 1 : 1.5;
  if (maxPixelRatio < 2) {
    steps.push(`pixel ratio limitado a ${maxPixelRatio}`);
  }
  if (input.reducedMotion) {
    steps.push("órbita automática e amortecimento desligados");
  }
  return { detail, shadows, antialias: !input.constrained, maxPixelRatio, steps };
}
