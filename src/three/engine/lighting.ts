import * as THREE from "three";
import {
  keyLightPosition,
  LIGHTING_PRESETS,
  sunDirection,
  type LightingPreset,
  type LightingPresetId,
} from "../lighting-presets";
import type { Bounds } from "../model";

/**
 * `LightingSetup`: três luzes e um céu ambiente.
 *
 * A sombra é **ortográfica e dimensionada ao `Bounds`**, porque uma `shadow.camera` a 200 m com um
 * mapa de 1024 pixels dá uns poucos píxeis por metro quadrado — o aspeto de "render amador" que
 * queremos evitar. O *preset* de iluminação muda a direção, a cor e a intensidade das três luzes, a
 * exposição do *tone mapping* e o brilho noturno dos vidros; é o `LightingPreset` do domínio
 * (`src/three/lighting-presets.ts`) que manda, nunca um estilo escrito aqui.
 */

export interface LightingOptions {
  readonly shadows: boolean;
  readonly readToken: (name: string) => string | null;
  /** 2048 em desktop, 1024 quando o dispositivo é limitado. */
  readonly shadowMapSize: number;
  readonly preset?: LightingPresetId;
}

export interface Lighting {
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  readonly hemisphere: THREE.HemisphereLight;
  update(bounds: Bounds): void;
  setShadows(enabled: boolean): void;
  /** Aplica o preset às luzes e devolve se as sombras devem ficar ligadas (qualidade ∧ preset). */
  applyPreset(presetId: LightingPresetId): boolean;
  readonly preset: LightingPresetId;
  dispose(): void;
}

export function createLighting(scene: THREE.Scene, options: LightingOptions): Lighting {
  let presetId: LightingPresetId = options.preset ?? "meio-dia";
  let preset: LightingPreset = LIGHTING_PRESETS[presetId];

  const sky = new THREE.Color(preset.skyColor);
  const ground = new THREE.Color(preset.groundColor);

  const hemisphere = new THREE.HemisphereLight(sky.getHex(), ground.getHex(), preset.hemiIntensity);
  const key = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
  const fill = new THREE.DirectionalLight(preset.fillColor, preset.fillIntensity);

  key.castShadow = options.shadows && preset.shadows;
  key.shadow.mapSize.set(options.shadowMapSize, options.shadowMapSize);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;

  scene.add(hemisphere, key, fill);

  let placedRadius = 0;
  let center: [number, number, number] = [0, 2, 0];

  function place(bounds: Bounds): void {
    const radius = Math.max(6, bounds.radius * 1.15);
    center = [bounds.center[0], bounds.center[1], bounds.center[2]];
    const [kx, ky, kz] = keyLightPosition(preset, radius);
    key.position.set(center[0] + kx, center[1] + ky, center[2] + kz);
    key.target.position.set(center[0], center[1], center[2]);
    const [sx, , sz] = sunDirection(preset);
    // O preenchimento vem do lado oposto e baixo: abre as sombras sem apagar o volume.
    fill.position.set(
      center[0] - sx * radius * 0.8,
      center[1] + radius * 0.35,
      center[2] - sz * radius * 0.8,
    );
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
    get preset() {
      return presetId;
    },
    update(bounds) {
      // Só reposicionar quando a escala da cena muda de facto: `sync` corre a cada seleção.
      const radius = Math.max(6, bounds.radius * 1.15);
      const moved = Math.abs(radius - placedRadius) > 0.5;
      const recentred =
        Math.abs(bounds.center[1] - center[1]) > 0.5 ||
        Math.abs(bounds.center[0] - center[0]) > 0.5 ||
        Math.abs(bounds.center[2] - center[2]) > 0.5;
      if (moved || recentred) {
        place(bounds);
      }
    },
    applyPreset(next) {
      if (next === presetId) {
        return key.castShadow;
      }
      presetId = next;
      preset = LIGHTING_PRESETS[next];
      key.color.set(preset.sunColor);
      key.intensity = preset.sunIntensity;
      fill.color.set(preset.fillColor);
      fill.intensity = preset.fillIntensity;
      hemisphere.color.set(preset.skyColor);
      hemisphere.groundColor.set(preset.groundColor);
      hemisphere.intensity = preset.hemiIntensity;
      // A direção mudou: o frustum ortográfico tem de a acompanhar, senão a sombra sai do lote.
      place({ min: center, max: center, center, radius: Math.max(6, placedRadius / 1.15) });
      return options.shadows && preset.shadows;
    },
    setShadows(enabled) {
      key.castShadow = enabled && preset.shadows;
      if (!key.castShadow && key.shadow.map !== null) {
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
