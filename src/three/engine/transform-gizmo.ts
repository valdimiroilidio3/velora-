import type * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { EditRule } from "../edit-rules";
import type { TransformPatch } from "../model";
import { degToRad, mm, radToDeg } from "../units";
import { EDIT_LIMITS } from "../materials";

/**
 * `TransformController`: o gizmo de arrasto, e o **único** lugar onde a cena escreve no documento.
 *
 * Como é que dados e representação ficam coerentes: o gizmo move o `Object3D` para haver resposta
 * imediata, mas no fim do arrasto o resultado é convertido em `TransformPatch`, entregue ao store,
 * validado pelas regras de edição e escrito no documento; a cena volta a ser sincronizada a partir
 * do documento. O que se vê é sempre o que está nos dados — nunca um estado paralelo.
 *
 * Eixos que a regra não permite nem são mostrados: é melhor não oferecer uma alça do que oferecê-la
 * e recusar o movimento no fim.
 */

export type GizmoMode = "translate" | "rotate" | "scale";

export const GIZMO_MODE_LABELS: Readonly<Record<GizmoMode, string>> = {
  translate: "Mover",
  rotate: "Rodar",
  scale: "Escalar",
};

export interface BaseTransform {
  position: [number, number, number];
  rotationYDeg: number;
  scale: [number, number, number];
}

const IDLE_BASE: BaseTransform = { position: [0, 0, 0], rotationYDeg: 0, scale: [1, 1, 1] };

export interface GizmoController {
  /**
   * Ligar/desligar o gizmo a um elemento. É também a forma de o realinhar depois de uma edição
   * vinda do painel: `attach` volta a ler a transformação real do objeto, por isso o `base` do
   * arrasto seguinte parte sempre do documento — nunca de um valor intermédio.
   */
  attach(elementId: string | null, object: THREE.Object3D | null, rule: EditRule | null): void;
  setMode(mode: GizmoMode): void;
  setEnabled(enabled: boolean): void;
  readonly mode: GizmoMode;
  dispose(): void;
}

export interface GizmoOptions {
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;
  readonly scene: THREE.Scene;
  /** Deslocamento máximo de um arrasto, derivado dos *bounds* — não é um número mágico. */
  getTranslationLimit: () => number;
  onDragStart: (() => void) | undefined;
  onDragEnd: (() => void) | undefined;
  onCommit: (elementId: string, patch: TransformPatch) => void;
  onLiveChange: (() => void) | undefined;
  /** Espessura no eixo Y (lajes/coberturas) ou no eixo Z (paredes/divisórias). */
  thicknessAxis?: ((elementId: string) => "y" | "z") | undefined;
}

function clampNumber(value: number, origin: number, limit: number): number {
  const delta = Math.max(-limit, Math.min(limit, value - origin));
  return mm(origin + delta);
}

function clampScale(value: number): number {
  return mm(Math.max(EDIT_LIMITS.minScale, Math.min(EDIT_LIMITS.maxScale, value)));
}

/**
 * Conversão `Object3D` → `TransformPatch`, separada do `TransformControls` porque é aqui que vive
 * a aritmética de limites e de eixos permitidos — e é aritmética, logo testável sem browser.
 *
 * Repare no que **não** é feito: nada disto escreve no documento. O `patch` vai para o store, que
 * aplica `withTransform` (regras, *snapping*, rejeições). Se a regra diz que uma parede estrutural
 * não escala, o `scale` devolvido aqui é `[1, 1, 1]` seja o que for que o rato tentou fazer.
 */
export function computePatch(
  object: THREE.Object3D,
  base: BaseTransform,
  rule: EditRule,
  translationLimit: number,
  thicknessIsVertical: boolean,
): TransformPatch {
  const allowPlanar = rule.move === "planar" || rule.move === "free";
  const allowVertical = rule.move === "vertical" || rule.move === "free";
  const position: [number, number, number] = [
    allowPlanar ? clampNumber(object.position.x, base.position[0], translationLimit) : base.position[0],
    allowVertical ? clampNumber(object.position.y, base.position[1], translationLimit) : base.position[1],
    allowPlanar ? clampNumber(object.position.z, base.position[2], translationLimit) : base.position[2],
  ];
  const rotationYDeg = rule.rotate ? mm(radToDeg(object.rotation.y)) : base.rotationYDeg;

  let scale: [number, number, number] = [1, 1, 1];
  if (rule.scale === "uniform") {
    scale = [clampScale(object.scale.x), clampScale(object.scale.y), clampScale(object.scale.z)];
  } else if (rule.scale === "thickness") {
    const value = thicknessIsVertical ? clampScale(object.scale.y) : clampScale(object.scale.z);
    scale = thicknessIsVertical ? [1, value, 1] : [1, 1, value];
  }

  return { position, rotationYDeg, scale };
}

export function createTransformGizmo(options: GizmoOptions): GizmoController {
  const controls = new TransformControls(options.camera, options.domElement);
  controls.setSize(0.82);
  controls.setSpace("world");

  const helper = controls.getHelper();
  helper.name = "velora.gizmo";
  options.scene.add(helper);

  let attachedId: string | null = null;
  let rule: EditRule | null = null;
  let base: BaseTransform = IDLE_BASE;
  let mode: GizmoMode = "translate";

  function thicknessIsVertical(): boolean {
    if (attachedId === null || options.thicknessAxis === undefined) {
      return false;
    }
    return options.thicknessAxis(attachedId) === "y";
  }

  function applyAxes(): void {
    if (rule === null) {
      return;
    }
    if (mode === "translate") {
      const planar = rule.move === "planar" || rule.move === "free";
      controls.showX = planar;
      controls.showZ = planar;
      controls.showY = rule.move === "vertical" || rule.move === "free";
      return;
    }
    if (mode === "rotate") {
      // Só o eixo vertical faz sentido num modelo em que o piso é a unidade de projeto.
      controls.showX = false;
      controls.showY = rule.rotate;
      controls.showZ = false;
      return;
    }
    const uniform = rule.scale === "uniform";
    controls.showX = uniform;
    controls.showZ = uniform || (rule.scale === "thickness" && !thicknessIsVertical());
    controls.showY = uniform || (rule.scale === "thickness" && thicknessIsVertical());
  }

  /** Converte o `Object3D` do gizmo em patch de documento, já restringido pela regra. */
  function commit(): void {
    const object = controls.object as THREE.Object3D | null;
    const elementId = attachedId;
    if (object === null || elementId === null || rule === null) {
      return;
    }
    options.onCommit(
      elementId,
      computePatch(object, base, rule, Math.max(1, options.getTranslationLimit()), thicknessIsVertical()),
    );
  }

  const onDragging = (event: unknown): void => {
    const dragging = Boolean((event as { value?: boolean }).value);
    if (dragging) {
      const object = controls.object as THREE.Object3D | null;
      if (object !== null) {
        base = {
          position: [object.position.x, object.position.y, object.position.z],
          rotationYDeg: radToDeg(object.rotation.y),
          scale: [object.scale.x, object.scale.y, object.scale.z],
        };
      }
      options.onDragStart?.();
    } else {
      commit();
      options.onDragEnd?.();
    }
  };

  const onObjectChange = (): void => {
    options.onLiveChange?.();
  };

  controls.addEventListener("dragging-changed", onDragging);
  controls.addEventListener("objectChange", onObjectChange);

  return {
    attach(elementId, object, nextRule) {
      attachedId = elementId;
      rule = nextRule;
      if (object === null || elementId === null || nextRule === null) {
        controls.detach();
        base = IDLE_BASE;
        return;
      }
      base = {
        position: [object.position.x, object.position.y, object.position.z],
        rotationYDeg: radToDeg(object.rotation.y),
        scale: [object.scale.x, object.scale.y, object.scale.z],
      };
      controls.attach(object);
      controls.setTranslationSnap(nextRule.snapM > 0 ? nextRule.snapM : null);
      controls.setRotationSnap(nextRule.snapDeg > 0 ? degToRad(nextRule.snapDeg) : null);
      controls.setScaleSnap(null);
      applyAxes();
    },
    setMode(next) {
      mode = next;
      controls.setMode(next);
      applyAxes();
    },
    setEnabled(enabled) {
      controls.enabled = enabled;
      helper.visible = enabled;
    },
    get mode() {
      return mode;
    },
    dispose() {
      controls.removeEventListener("dragging-changed", onDragging);
      controls.removeEventListener("objectChange", onObjectChange);
      controls.detach();
      options.scene.remove(helper);
      controls.dispose();
      attachedId = null;
      rule = null;
    },
  };
}
