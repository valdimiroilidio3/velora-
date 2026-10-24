import * as THREE from "three";
import type { Bounds } from "../model";

/**
 * `LightingSetup`: três luzes e nada mais.
 *
 * Escolha deliberada: sem HDRIs, sem `envMap`, sem luzes por material — a leitura de volumes em
 * arquitetura precisa de sombras legíveis e de faces planas, não de reflexos. A sombra é
 * **ortográfica e dimensionada aoBounds**, porque uma `shadow.camera` a 200 m com um mapa de 1024
 * pixels dá uma sombra em_PIXEL por metro quadrado, que é o aspeto de "render amador" que
 * queremos evitar.
 */

export interface LightingOptions {
  readonly shadows: boolean;
  readonly readToken: (name: string) => string | null;
  /** 2048 em desktop, 1024 quando o dispositivo é limitado. */
  readonly shadowMapSize: number;
}

export interface Lighting {
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  readonly hemisphere: THREE.HemisphereLight;
  update(bounds: Bounds): void;
  setShadows(enabled: boolean): void;
  dispose(): void;
}

export function createLighting(scene: THREE.Scene, options: LightingOptions): Lighting {
  const sky = new THREE.Color(options.readToken("--surface") ?? "#fffefb");
  const ground = new THREE.Color(options.readToken("--scene-ground") ?? "#d8d4cb");

  const hemisphere = new THREE.HemisphereLight(sky.getHex(), ground.getHex(), 1.05);
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);

  key.castShadow = options.shadows;
  key.shadow.mapSize.set(options.shadowMapSize, options.shadowMapSize);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;

  scene.add(hemisphere, key, fill);

  let placedRadius = 0;

  function place(bounds: Bounds): void {
    const radius = Math.max(6, bounds.radius * 1.15);
    const height = bounds.center[1] + radius * 0.9;
    key.position.set(radius * 0.85, height, radius * 0.6);
    key.target.position.set(bounds.center[0], bounds.center[1], bounds.center[2]);
    fill.position.set(-radius * 0.7, bounds.center[1] + radius * 0.45, -radius * 0.85);
    fill.target.position.copy(key.target.position);

    const camera = key.shadow.camera;
    camera.left = -radius;
    camera.right = radius;
    camera.top = radius;
    camera.bottom = -radius;
    camera.near = 0.5;
    camera.far = radius * 4;
    camera.updateProjectionMatrix();
    placedRadius = radius;
  }

  place({ min: [0, 0, 0], max: [0, 0, 0], center: [0, 2, 0], radius: 12 });

  return {
    key,
    fill,
    hemisphere,
    update(bounds) {
      // Só reposicionar quando a escala da cena muda de facto: `sync` corre a cada seleção.
      if (Math.abs(Math.max(6, bounds.radius * 1.15) - placedRadius) > 0.5) {
        place(bounds);
      }
    },
    setShadows(enabled) {
      key.castShadow = enabled;
      if (!enabled && key.shadow.map !== null) {
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
    },
    dispose() {
      scene.remove(hemisphere, key, fill);
      key.shadow.map?.dispose();
      key.target.removeFromParent();
      fill.target.removeFromParent();
      hemisphere.dispose?.();
      key.dispose?.();
      fill.dispose?.();
    },
  };
}
