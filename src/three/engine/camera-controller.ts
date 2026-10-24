import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Bounds } from "../model";
import { degToRad, mm } from "../units";

/**
 * `CameraController`: órbita, zoom e pan com limites, enquadramento por *bounds* e presets.
 *
 * Porque é que isto não é `camera.position.set(...)` à mão: um utilizador tem de conseguir
 * percorrer o edifício sem nunca se perder dele. As três fronteiras são (1) distância mínima e
 * máxima relativas ao raio do lote, (2) ângulo polar entre quase-prumo e quase-horizonte, e
 * (3) `maxTargetRadius`, que limita **para onde** se pode arrastar o alvo do pan — é o controlo
 * que faz o pan continuar a servir o modelo em vez de o abandonar.
 *
 * O scroll só é capturado dentro do canvas (o `domElement` do `OrbitControls` é o canvas): a
 * página continua a rolar fora da área interativa, como o pedido exige.
 */

// As etiquetas vivem em `../view-presets` (sem `three`); o motor reexporta para que quem usa o
// controlo de câmera não precise de conhecer a divisão.
import { VIEW_PRESETS, type ViewPreset } from "../view-presets";

export type { ViewPreset };
export { VIEW_PRESETS };

export const PITCH_LIMITS = { minRad: 0.05, maxRad: 1.45 } as const;
export const DISTANCE_LIMITS = { minFactor: 1.15, maxFactor: 12 } as const;
export const YAW_STEP = Math.PI / 12;
export const PITCH_STEP = Math.PI / 36;
export const DOLLY_STEP = 1.18;

export interface Framing {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly distance: number;
}

/** Ângulos por preset: [azimute°, elevação°] medidos a partir do eixo +Z, no sentido de `OrbitControls`. */
const PRESET_ANGLES: Readonly<Record<ViewPreset, { azimuthDeg: number; elevationDeg: number }>> = {
  perspetiva: { azimuthDeg: 40, elevationDeg: 26 },
  superior: { azimuthDeg: 0, elevationDeg: 88 },
  frontal: { azimuthDeg: 0, elevationDeg: 6 },
  lateral: { azimuthDeg: 90, elevationDeg: 6 },
};

export function computeFraming(bounds: Bounds, fovDeg = 38, preset: ViewPreset = "perspetiva"): Framing {
  const radius = Math.max(1, bounds.radius);
  const vertical = degToRad(fovDeg);
  // Distância para caber a meia-diagonal vertical+horizontal, com folga de 15 %.
  const distance = mm(Math.max((radius / Math.tan(vertical / 2)) * 1.15, radius * 2.1));
  const angles = PRESET_ANGLES[preset];
  const azimuth = degToRad(angles.azimuthDeg);
  const elevation = degToRad(angles.elevationDeg);
  const horizontal = Math.cos(elevation) * distance;
  return {
    position: [
      mm(bounds.center[0] + Math.sin(azimuth) * horizontal),
      mm(bounds.center[1] + Math.sin(elevation) * distance),
      mm(bounds.center[2] + Math.cos(azimuth) * horizontal),
    ],
    target: [bounds.center[0], bounds.center[1], bounds.center[2]],
    distance,
  };
}

export interface CameraController {
  readonly controls: OrbitControls;
  applyBounds(bounds: Bounds): void;
  frame(bounds: Bounds, preset?: ViewPreset): void;
  setView(preset: ViewPreset): void;
  reset(): void;
  nudge(yawDelta: number, pitchDelta: number): void;
  dolly(factor: number): void;
  /** Foca um elemento: o alvo vai à posição do objeto sem colidir com os limites. */
  focus(point: readonly [number, number, number]): void;
  setInteractive(enabled: boolean): void;
  update(deltaSeconds: number): boolean;
  state(): { distance: number; polarDeg: number; azimuthDeg: number };
  dispose(): void;
}

export interface CameraControllerOptions {
  readonly camera: THREE.PerspectiveCamera;
  readonly domElement: HTMLElement;
  readonly reducedMotion: boolean;
  onInteract: (() => void) | undefined;
}

export function createCameraController(options: CameraControllerOptions): CameraController {
  const controls = new OrbitControls(options.camera, options.domElement);
  controls.enableDamping = !options.reducedMotion;
  controls.dampingFactor = 0.085;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.7;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = false;
  controls.autoRotate = false;
  controls.minPolarAngle = PITCH_LIMITS.minRad;
  controls.maxPolarAngle = PITCH_LIMITS.maxRad;
  controls.minDistance = 4;
  controls.maxDistance = 400;
  controls.maxTargetRadius = 80;
  controls.keyPanSpeed = 12;
  controls.listenToKeyEvents(options.domElement as HTMLElement);

  let bounds: Bounds = { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 12 };
  let framing = computeFraming(bounds);

  function onEnd(): void {
    options.onInteract?.();
  }
  controls.addEventListener("start", onEnd);
  controls.addEventListener("change", onEnd);

  function applyBounds(next: Bounds): void {
    bounds = next;
    const radius = Math.max(1, next.radius);
    controls.minDistance = mm(radius * DISTANCE_LIMITS.minFactor);
    controls.maxDistance = mm(radius * DISTANCE_LIMITS.maxFactor);
    // O pan pode percorrer o lote, mas nunca para além dele: é o que impede "perder o modelo".
    controls.maxTargetRadius = mm(radius * 1.6);
  }

  applyBounds(bounds);

  return {
    controls,
    applyBounds,
    frame(next, preset = "perspetiva") {
      applyBounds(next);
      framing = computeFraming(next, options.camera.fov, preset);
      options.camera.position.set(framing.position[0], framing.position[1], framing.position[2]);
      controls.target.set(framing.target[0], framing.target[1], framing.target[2]);
      controls.update();
    },
    setView(preset) {
      // Mantém o zoom atual e troca só a direção: é o comportamento de um viewer de projeto,
      // não o de um slideshow que se aproxima de cada vez que se muda de vista.
      framing = computeFraming(bounds, options.camera.fov, preset);
      const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, controls.getDistance()));
      const direction = new THREE.Vector3(...framing.position)
        .sub(new THREE.Vector3(...framing.target))
        .normalize();
      controls.target.set(framing.target[0], framing.target[1], framing.target[2]);
      options.camera.position.copy(controls.target).addScaledVector(direction, distance);
      controls.update();
    },
    reset() {
      options.camera.position.set(...framing.position);
      controls.target.set(...framing.target);
      controls.update();
    },
    nudge(yawDelta, pitchDelta) {
      controls.rotateLeft(yawDelta);
      controls.rotateUp(pitchDelta);
      controls.update();
    },
    dolly(factor) {
      const distance = controls.getDistance() / factor;
      const clamped = Math.max(controls.minDistance, Math.min(controls.maxDistance, distance));
      const direction = new THREE.Vector3().subVectors(options.camera.position, controls.target).normalize();
      options.camera.position
        .copy(controls.target)
        .addScaledVector(direction, clamped - controls.getDistance());
      controls.update();
    },
    focus(point) {
      controls.target.set(mm(point[0]), mm(point[1]), mm(point[2]));
      controls.update();
    },
    setInteractive(enabled) {
      controls.enabled = enabled;
    },
    update(deltaSeconds) {
      // `update` devolve true quando algo se moveu: é o sinal para o scheduler continuar a desenhar.
      return controls.update(Math.min(0.1, deltaSeconds));
    },
    state() {
      return {
        distance: mm(controls.getDistance()),
        polarDeg: mm((controls.getPolarAngle() * 180) / Math.PI),
        azimuthDeg: mm((controls.getAzimuthalAngle() * 180) / Math.PI),
      };
    },
    dispose() {
      controls.removeEventListener("start", onEnd);
      controls.removeEventListener("change", onEnd);
      controls.stopListenToKeyEvents();
      controls.dispose();
    },
  };
}
