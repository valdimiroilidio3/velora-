import {
  documentBounds,
  elementDimensions,
  nominalSize,
  type Bounds,
  type SceneDocument,
  type SceneElement,
} from "./model";
import { materialFor, stairSteps } from "./materials";
import { mm, type Vec3 } from "./units";

/**
 * Plano de renderização: a projeção determinística do documento para o que o GPU tem de desenhar.
 *
 * Existe por uma razão prática de arquitetura: a sincronização dados→cena tem de ser **testável sem
 * browser**. O código de `three` consome este plano; nada no plano sabe o que é um `Mesh`. Se no
 * futuro trocarmos de motor (ou desenharmos a mesma coisa em SVG a 3 dimensões), este é o contrato
 * que sobrevive.
 */

export interface PrimitivePlan {
  readonly key: string;
  /** Dimensão **nominal** (sem escala): a escala vive no `Object3D`, não na geometria. */
  readonly size: Vec3;
  /** Offset local em relação à origem do elemento (0 para tudo o que não é escada). */
  readonly offset: Vec3;
}

export interface ElementTransform {
  readonly position: Vec3;
  readonly rotationYDeg: number;
  readonly scale: Vec3;
}

export interface ElementPlan {
  readonly elementId: string;
  readonly category: SceneElement["category"];
  readonly materialId: SceneElement["materialId"];
  readonly name: string;
  readonly transform: ElementTransform;
  readonly primitives: readonly PrimitivePlan[];
  /** Selecionável = aparece na lista de hits do raycast. Terreno/plataforma ficam fora. */
  readonly selectable: boolean;
}

export interface RenderPlan {
  readonly elements: readonly ElementPlan[];
  readonly bounds: Bounds;
  readonly primitiveCount: number;
  readonly orientationDeg: number;
}

function primitivesFor(element: SceneElement): PrimitivePlan[] {
  if (element.geometry.kind === "stairs") {
    const steps = stairSteps(
      element.geometry.widthM,
      element.geometry.runM,
      element.geometry.riseM,
      element.geometry.steps,
    );
    return steps.map((step, index) => ({
      key: `#${String(index).padStart(2, "0")}`,
      size: step.size,
      offset: step.offset,
    }));
  }
  return [{ key: "body", size: nominalSize(element.geometry), offset: [0, 0, 0] }];
}

export function buildRenderPlan(document: SceneDocument, onlyVisible = true): RenderPlan {
  const elements: ElementPlan[] = [];
  let primitiveCount = 0;

  for (const element of document.elements) {
    if (onlyVisible && !element.visible) {
      continue;
    }
    const primitives = primitivesFor(element);
    primitiveCount += primitives.length;
    elements.push({
      elementId: element.id,
      category: element.category,
      // O plano transporta o material já resolvido: o renderer não consulta tabelas por elemento.
      materialId: element.materialId,
      name: element.name,
      transform: {
        position: element.transform.position,
        rotationYDeg: element.transform.rotationYDeg,
        scale: element.transform.scale,
      },
      primitives,
      selectable: !element.locked,
    });
  }

  return {
    elements,
    bounds: documentBounds(document, onlyVisible),
    primitiveCount,
    orientationDeg: document.orientationDeg,
  };
}

/** Dimensões efetivas de um elemento (nominal × escala) — as mesmas que o painel mostra. */
export function planDimensions(element: SceneElement): Vec3 {
  return elementDimensions(element);
}

/** Centróide aproximado do elemento, a partir da sua origem e da sua caixa nominal. */
export function planCenter(plan: ElementPlan): Vec3 {
  let top = -Infinity;
  let bottom = Infinity;
  for (const primitive of plan.primitives) {
    const half = primitive.size[1] / 2;
    top = Math.max(top, plan.transform.position[1] + primitive.offset[1] + half);
    bottom = Math.min(bottom, plan.transform.position[1] + primitive.offset[1] - half);
  }
  const middleY = top === -Infinity ? plan.transform.position[1] : mm((top + bottom) / 2);
  return [plan.transform.position[0], middleY, plan.transform.position[2]];
}

/** Altura total do volume do elemento, para o enquadramento de seleção. */
export function planHeight(plan: ElementPlan): number {
  let top = -Infinity;
  let bottom = Infinity;
  for (const primitive of plan.primitives) {
    const half = (primitive.size[1] / 2) * plan.transform.scale[1];
    top = Math.max(top, primitive.offset[1] + half);
    bottom = Math.min(bottom, primitive.offset[1] - half);
  }
  return top === -Infinity ? 0 : mm(top - bottom);
}

export { materialFor };
