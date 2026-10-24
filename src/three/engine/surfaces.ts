import * as THREE from "three";
import type { MaterialId } from "../model";
import { SURFACE_BY_MATERIAL, buildSurfaceMaps, repeatFor, surfaceBytes } from "../surfaces";
import type { QualityTier } from "./viewport";

/**
 * Texturas do palco: **o único lugar** onde os mapas procedurais de `surfaces.ts` tocam em `three`.
 *
 * `DataTexture` em vez de `<img>`/KTX2: não há ficheiros para descarregar, não há licença a
 * registar, e a geração é síncrona e determinística (logo testável). O custo é ser RGBA 8 bits sem
 * compressão — por isso a resolução é uma decisão de qualidade e não um default: 0 mapas em `leve`,
 * 256 px em `equilibrada`, 512 px em `alta`, com os bytes reais pedidos ao registo.
 */

export interface SurfaceSet {
  readonly materialId: MaterialId;
  readonly map: THREE.DataTexture;
  readonly roughnessMap: THREE.DataTexture;
  readonly normalMap: THREE.DataTexture;
  readonly bytes: number;
}

export interface SurfaceLibrary {
  get(materialId: MaterialId): SurfaceSet | null;
  /** Repetição física do *tile* para o painel médio que usa este material. */
  setRepeat(materialId: MaterialId, widthM: number, heightM: number): void;
  setQuality(tier: QualityTier): void;
  setAnisotropy(max: number): void;
  /** Bytes de CPU dos mapas vivos — entra na linha de estado e no orçamento declarado. */
  bytes(): number;
  size(): number;
  dispose(): void;
}

const RESOLUTION: Record<QualityTier, number> = { leve: 0, equilibrada: 256, alta: 512 };

function texture(data: Uint8Array, size: number, colorSpace: THREE.ColorSpace): THREE.DataTexture {
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.colorSpace = colorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  // `flipY` do `DataTexture` é `false` por omissão; o gerador escreve a linha 0 como a base do
  // *tile*, que é também o que `RepeatWrapping` espera — mudar isto aqui criaria um espelho.
  map.needsUpdate = true;
  return map;
}

export function createSurfaceLibrary(initial: QualityTier = "equilibrada"): SurfaceLibrary {
  const sets = new Map<MaterialId, SurfaceSet>();
  let tier = initial;
  let anisotropy = 1;

  function build(materialId: MaterialId): SurfaceSet | null {
    const size = RESOLUTION[tier];
    if (size === 0) {
      return null;
    }
    const def = SURFACE_BY_MATERIAL[materialId];
    const maps = buildSurfaceMaps(def, 7, size);
    const set: SurfaceSet = {
      materialId,
      map: texture(maps.albedo, size, THREE.SRGBColorSpace),
      // `roughnessMap` lê o verde, `normalMap` é linear: nenhum dos dois pode ser sRGB.
      roughnessMap: texture(maps.roughness, size, THREE.NoColorSpace),
      normalMap: texture(maps.normal, size, THREE.NoColorSpace),
      bytes: surfaceBytes(size) * 3,
    };
    for (const map of [set.map, set.roughnessMap, set.normalMap]) {
      map.anisotropy = anisotropy;
    }
    return set;
  }

  function release(): void {
    for (const set of sets.values()) {
      set.map.dispose();
      set.roughnessMap.dispose();
      set.normalMap.dispose();
    }
    sets.clear();
  }

  return {
    get(materialId) {
      if (RESOLUTION[tier] === 0) {
        return null;
      }
      const existing = sets.get(materialId);
      if (existing !== undefined) {
        return existing;
      }
      const built = build(materialId);
      if (built === null) {
        return null;
      }
      sets.set(materialId, built);
      return built;
    },
    setRepeat(materialId, widthM, heightM) {
      const set = sets.get(materialId);
      if (set === undefined) {
        return;
      }
      const [rx, ry] = repeatFor(widthM, heightM, SURFACE_BY_MATERIAL[materialId].tileMeters);
      for (const map of [set.map, set.roughnessMap, set.normalMap]) {
        map.repeat.set(rx, ry);
      }
    },
    setQuality(next) {
      if (next === tier) {
        return;
      }
      tier = next;
      // Trocar de qualidade **liberta** os mapas antigos: sem isto, o seletor de qualidade era um
      // fugas-de-memória com bom aspeto.
      release();
    },
    setAnisotropy(max) {
      anisotropy = Math.max(1, Math.min(8, Math.floor(max) || 1));
      for (const set of sets.values()) {
        for (const map of [set.map, set.roughnessMap, set.normalMap]) {
          map.anisotropy = anisotropy;
          map.needsUpdate = true;
        }
      }
    },
    bytes() {
      let total = 0;
      for (const set of sets.values()) {
        total += set.bytes;
      }
      return total;
    },
    size: () => sets.size,
    dispose: release,
  };
}

/** Mediana das dimensões de painel por material — é o que dá escala física ao *tiling*. */
export function medianPanelSize(
  elements: readonly { readonly materialId: MaterialId; readonly widthM: number; readonly heightM: number }[],
): Map<MaterialId, { widthM: number; heightM: number }> {
  const acc = new Map<MaterialId, { w: number[]; h: number[] }>();
  for (const element of elements) {
    const bucket = acc.get(element.materialId) ?? { w: [], h: [] };
    bucket.w.push(element.widthM);
    bucket.h.push(element.heightM);
    acc.set(element.materialId, bucket);
  }
  const median = (values: number[]): number => {
    if (values.length === 0) {
      return 1;
    }
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 1;
  };
  const out = new Map<MaterialId, { widthM: number; heightM: number }>();
  for (const [id, bucket] of acc) {
    out.set(id, { widthM: median(bucket.w), heightM: median(bucket.h) });
  }
  return out;
}
