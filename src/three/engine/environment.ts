import * as THREE from "three";
import { buildSkyEquirect, LIGHTING_PRESETS, type LightingPresetId } from "../lighting-presets";
import type { RendererLike } from "./scene-manager";
import type { QualityTier } from "./viewport";

/**
 * Ambiente do palco (`Fase 4`): *image-based lighting* gerado no cliente.
 *
 * Nada de HDRI descarregado — a aplicação não pode depender de URLs externas para recursos
 * essenciais, e um `.hdr` de 4 MB entraria no *bundle*. O mapa vem de
 * `lighting-presets.buildSkyEquirect` (determinístico, testado em Node) e é pré-filtrado com
 * `PMREMGenerator`, que é o que faz as reflexões serem coerentes com a rugosidade do material.
 *
 * O `PMREMGenerator` precisa de um `WebGLRenderer` real. O `RendererLike` do palco é uma interface
 * estreita (porque é o que permite testar o ciclo de vida em Node), por isso o *path* de GL é
 * detetado em tempo de execução e **degradado**: sem GL fica o mapa equiretangular cru (reflexões
 * nítidas, sem pré-filtro), e em qualidade `leve` não fica nada. Nenhum dos dois casos rebenta —
 * é o mesmo princípio do `createRenderer` injetado.
 */

export interface StageEnvironment {
  /** Recarrega o céu para o *preset* dado; devolve `false` se não havia nada para fazer. */
  update(presetId: LightingPresetId, tier: QualityTier): boolean;
  applyTo(scene: THREE.Scene, intensity: number): void;
  readonly texture: THREE.Texture | null;
  dispose(): void;
}

interface WebGLish {
  getContext(): unknown;
}

function hasGL(renderer: RendererLike): renderer is RendererLike & WebGLish {
  return typeof (renderer as Partial<WebGLish>).getContext === "function";
}

export function createStageEnvironment(renderer: RendererLike, scene: THREE.Scene): StageEnvironment {
  let texture: THREE.Texture | null = null;
  let pmremTarget: THREE.WebGLRenderTarget | null = null;
  let disposed = false;

  function release(): void {
    if (texture !== null) {
      texture.dispose();
      texture = null;
    }
    if (pmremTarget !== null) {
      pmremTarget.dispose();
      pmremTarget = null;
    }
    scene.environment = null;
  }

  return {
    get texture() {
      return texture;
    },
    update(presetId, tier) {
      if (disposed || tier === "leve") {
        if (texture !== null) {
          release();
        }
        return false;
      }
      const preset = LIGHTING_PRESETS[presetId];
      const sky = buildSkyEquirect(preset, 128, 64);
      const source = new THREE.DataTexture(sky.rgba, sky.width, sky.height, THREE.RGBAFormat);
      source.colorSpace = THREE.SRGBColorSpace;
      source.mapping = THREE.EquirectangularReflectionMapping;
      source.needsUpdate = true;

      let nextTexture: THREE.Texture = source;
      let nextTarget: THREE.WebGLRenderTarget | null = null;
      if (hasGL(renderer)) {
        try {
          const pmrem = new THREE.PMREMGenerator(renderer as unknown as THREE.WebGLRenderer);
          pmrem.compileEquirectangularShader();
          const target = pmrem.fromEquirectangular(source);
          nextTexture = target.texture;
          nextTarget = target;
          // O *source* só servia de entrada ao PMREM: depois disto não é referenciado por nada.
          source.dispose();
          pmrem.dispose();
        } catch {
          // Perda de contexto a meio de um *upload*: o palco tem de continuar a desenhar sem ambiente.
          nextTexture = source;
        }
      }

      if (texture !== null) {
        texture.dispose();
      }
      if (pmremTarget !== null) {
        pmremTarget.dispose();
      }
      texture = nextTexture;
      pmremTarget = nextTarget;
      this.applyTo(scene, preset.envIntensity);
      return true;
    },
    applyTo(target, intensity) {
      target.environment = texture;
      // `environmentIntensity` existe desde r163; em builds mais antigos o material continua a
      // ser ajustado por `envMapIntensity`, por isso isto é um bónus, não uma dependência.
      target.environmentIntensity = intensity;
    },
    dispose() {
      disposed = true;
      release();
    },
  };
}
