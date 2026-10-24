import * as THREE from "three";

/**
 * `SelectionManager`: decide **o que** o utilizador quis dizer quando clicou no palco.
 *
 * Dois detalhes que separam um editor usável de um jogável:
 *  · um clique só seleciona se o ponteiro não se deslocou — caso contrário era uma órbita;
 *  · o hit é resolvido até ao **elemento do documento**, não até à malha: uma escada são 15
 *    `Mesh` e tem de se comportar como um elemento.
 */

export const CLICK_SLOP_PX = 4;

/** Sobe na hierarquia até encontrar o grupo que transporta o id do documento. */
export function resolveElementId(object: THREE.Object3D | null): string | null {
  let current: THREE.Object3D | null = object;
  while (current !== null) {
    const candidate = current.userData.elementId;
    if (typeof candidate === "string") {
      return candidate;
    }
    current = current.parent;
  }
  return null;
}

/** Coordenadas normalizadas do device para o raycaster (−1..1 nos dois eixos). */
export function toNdc(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
    y: -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
  };
}

/** Primeiro hit de uma lista de candidatos, sem depender do DOM (testável em Node). */
export function firstHit(raycaster: THREE.Raycaster, objects: readonly THREE.Object3D[]): string | null {
  if (objects.length === 0) {
    return null;
  }
  const hits = raycaster.intersectObjects([...objects], true);
  for (const hit of hits) {
    const id = resolveElementId(hit.object);
    if (id !== null) {
      return id;
    }
  }
  return null;
}

export interface SelectionOptions {
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;
  readonly getTargets: () => THREE.Object3D[];
  /** `additive` = Shift: soma/remove da seleção em vez de substituir. */
  onSelect: (elementId: string | null, additive: boolean) => void;
  onHover: (elementId: string | null) => void;
  /** O palco pode estar em modo gizmo: aí o clique não troca a seleção enquanto se arrasta. */
  isInteractive?: (() => boolean) | undefined;
}

export interface SelectionManager {
  setEnabled(enabled: boolean): void;
  /** Força o raycaster a recalcular (a cena é reconstruída em `sync`). */
  invalidate(): void;
  dispose(): void;
}

export function createSelectionManager(options: SelectionOptions): SelectionManager {
  const raycaster = new THREE.Raycaster();
  let enabled = true;
  let pointerStart: { x: number; y: number; time: number } | null = null;
  let hoverFrame = 0;
  let lastHover: string | null = null;

  function hitAt(clientX: number, clientY: number): string | null {
    const rect = options.domElement.getBoundingClientRect();
    const ndc = toNdc(rect, clientX, clientY);
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), options.camera);
    return firstHit(raycaster, options.getTargets());
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (!enabled || event.button !== 0) {
      return;
    }
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!enabled || pointerStart === null || (options.isInteractive ?? (() => true))() === false) {
      pointerStart = null;
      return;
    }
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    const wasClick = moved <= CLICK_SLOP_PX;
    const start = pointerStart;
    pointerStart = null;
    if (!wasClick || performance.now() - start.time > 700) {
      return;
    }
    options.onSelect(hitAt(event.clientX, event.clientY), event.shiftKey);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!enabled || pointerStart !== null) {
      return;
    }
    // Um hover por frame: raycast a 60 Hz a varrer 400 meshes é desperdício puro.
    if (hoverFrame !== 0) {
      return;
    }
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      const id = hitAt(event.clientX, event.clientY);
      if (id !== lastHover) {
        lastHover = id;
        options.onHover(id);
      }
    });
  };

  const onPointerLeave = (): void => {
    if (lastHover !== null) {
      lastHover = null;
      options.onHover(null);
    }
  };

  options.domElement.addEventListener("pointerdown", onPointerDown);
  options.domElement.addEventListener("pointerup", onPointerUp);
  options.domElement.addEventListener("pointermove", onPointerMove);
  options.domElement.addEventListener("pointerleave", onPointerLeave);

  return {
    setEnabled(next) {
      enabled = next;
      if (!next && lastHover !== null) {
        lastHover = null;
        options.onHover(null);
      }
    },
    invalidate() {
      lastHover = null;
    },
    dispose() {
      if (hoverFrame !== 0) {
        cancelAnimationFrame(hoverFrame);
      }
      options.domElement.removeEventListener("pointerdown", onPointerDown);
      options.domElement.removeEventListener("pointerup", onPointerUp);
      options.domElement.removeEventListener("pointermove", onPointerMove);
      options.domElement.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
