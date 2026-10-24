import * as THREE from "three";
import { MATERIALS } from "../materials";
import type { MaterialId, SceneDocument } from "../model";
import { SURFACE_BY_MATERIAL } from "../surfaces";
import type { SurfaceLibrary } from "./surfaces";

/**
 * Materiais Three.js construídos a partir de `MATERIALS` (os parâmetros vivem fora de `three`,
 * ver `src/three/materials.ts`).
 *
 * O registo é **por chave de material**, não por elemento: um edifício com 400 paredes usa um
 * material, não 400. É isso que mantém as trocas de estado do GPU baixas e o `dispose()` honesto.
 *
 * Cores vêm sempre dos tokens CSS (`--scene-*`, `--accent`): `readToken` é injetado precisamente
 * para que o teste em Node, sem CSS, possa alimentar cores fixas.
 *
 * Desde a Fase 4, os materiais têm também **superfície**: mapas procedurais gerados em
 * `src/three/surfaces.ts` e materializados por `SurfaceLibrary`. A biblioteca de texturas é
 * opcional (ausente em `leve` e ausente em teste) e é **emprestada** — o registo usa os mapas,
 * quem os liberta é o palco. Confundir posse aqui é a forma clássica de partir um `dispose()`.
 */

export interface MaterialRegistry {
  acquire(id: MaterialId): THREE.MeshStandardMaterial;
  /** Re lê os tokens (mudança de tema) sem reconstruir geometria nem materiais. */
  refresh(): void;
  /**
   * Define o conjunto realçado de uma só vez. Com uma chamada por objeto, a segunda limaria a
   * primeira — por isto a API é em lote e não por elemento.
   */
  setHighlights(entries: readonly HighlightEntry[]): void;
  readonly selectionColor: THREE.Color;
  /** Luz noturna interior (vidros e mobiliário acendem-se) — ver `SURFACE_BY_MATERIAL`. */
  setNight(enabled: boolean): void;
  /** Reanexa os mapas depois de uma mudança de qualidade (a biblioteca libertou os antigos). */
  reattachMaps(): void;
  dispose(): void;
  /** Contagem para o `dispose` poder ser afirmado em teste. */
  size(): number;
}

export interface HighlightEntry {
  readonly object: THREE.Object3D;
  readonly mode: "selected" | "hover";
}

export interface MaterialRegistryOptions {
  readonly readToken: (name: string) => string | null;
  readonly document?: Document | undefined;
  /** Presente só quando a qualidade permite mapas; `null` deixa o material proceduralmente liso. */
  readonly surfaces?: SurfaceLibrary | undefined;
}

/**
 * Quanta reflexo o ambiente pode dar a uma superfície. Rugosidade 0,98 (relva) quase nada, 0,15
 * (vidro) quase tudo — é a curva usual de *art direction*, não uma medição de laboratório.
 */
export function envMapIntensityFor(roughness: number): number {
  return Number((0.18 + Math.pow(1 - roughness, 2.2) * 0.95).toFixed(3));
}

function colorFrom(readToken: (name: string) => string | null, token: string, fallback: string): THREE.Color {
  const raw = readToken(token);
  return new THREE.Color(raw !== null && raw.length > 0 ? raw : fallback);
}

export function createMaterialRegistry(options: MaterialRegistryOptions): MaterialRegistry {
  const cache = new Map<MaterialId, THREE.MeshStandardMaterial>();
  const surfaces = options.surfaces ?? null;
  const read = options.readToken;
  let night = false;
  const selectionColor = colorFrom(read, "--accent", "#0f4f47");
  const hoverColor = colorFrom(read, "--line-control", "#7b8087");

  /**
   * Contornos do realce, **por registo** (nunca partilhados entre módulos: dois palcos na mesma
   * página não se podem limpar um ao outro). Cada entrada leva a geometria e o material, porque os
   * dois são criados aqui e têm de ser libertados aqui.
   */
  const highlights: {
    object: THREE.LineSegments;
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  }[] = [];

  function clearHighlights(): void {
    for (const entry of highlights) {
      if (entry.object.parent !== null) {
        entry.object.parent.remove(entry.object);
      }
      entry.geometry.dispose();
      entry.material.dispose();
    }
    highlights.length = 0;
  }

  function applyColors(): void {
    for (const [id, material] of cache) {
      const params = MATERIALS[id];
      material.color.copy(colorFrom(read, params.colorToken, params.fallbackColor));
      material.opacity = params.opacity;
      material.transparent = params.transparent;
      // Vidros sem `depthWrite` deixam ver o interior sem artefactos de ordenação.
      material.depthWrite = !params.transparent;
      applyNight(id, material);
      material.needsUpdate = true;
    }
  }

  /** Brilho interior: só existe onde a superfície o declara, e só no preset noturno. */
  function applyNight(id: MaterialId, material: THREE.MeshStandardMaterial): void {
    const def = SURFACE_BY_MATERIAL[id];
    if (def.nightEmissive <= 0) {
      material.emissive.setRGB(0, 0, 0);
      material.emissiveIntensity = 1;
      return;
    }
    material.emissive.set(def.emissiveColor);
    material.emissiveIntensity = night ? def.nightEmissive : 0;
  }

  function attachMaps(id: MaterialId, material: THREE.MeshStandardMaterial): void {
    const set = surfaces === null ? null : surfaces.get(id);
    if (set === null || set === undefined) {
      material.map = null;
      material.roughnessMap = null;
      material.normalMap = null;
    } else {
      material.map = set.map;
      material.roughnessMap = set.roughnessMap;
      material.normalMap = set.normalMap;
      const def = SURFACE_BY_MATERIAL[id];
      material.normalScale.set(def.bump, def.bump);
    }
    // `needsUpdate` não é opcional: adicionar/remover um mapa muda o *programa* do *shader*.
    material.needsUpdate = true;
  }

  return {
    acquire(id) {
      const existing = cache.get(id);
      if (existing !== undefined) {
        return existing;
      }
      const params = MATERIALS[id];
      const material = new THREE.MeshStandardMaterial({
        color: colorFrom(read, params.colorToken, params.fallbackColor),
        roughness: params.roughness,
        metalness: params.metalness,
        opacity: params.opacity,
        transparent: params.transparent,
      });
      material.depthWrite = !params.transparent;
      material.envMapIntensity = envMapIntensityFor(params.roughness);
      material.name = `velora.material.${id}`;
      attachMaps(id, material);
      cache.set(id, material);
      return material;
    },
    refresh: applyColors,
    setNight(enabled) {
      if (night === enabled) {
        return;
      }
      night = enabled;
      for (const [id, material] of cache) {
        applyNight(id, material);
        material.needsUpdate = true;
      }
    },
    /** Chamado pelo palco quando a qualidade mudou e os mapas voltaram a ser construídos. */
    reattachMaps() {
      for (const [id, material] of cache) {
        attachMaps(id, material);
      }
    },
    setHighlights(entries) {
      // O realce não pode ser `emissive` no material partilhado: isso pintaria os 400 elementos que
      // usam a mesma parede de fachada. Vive num contorno dedicado, adicionado ao próprio mesh.
      clearHighlights();
      for (const entry of entries) {
        const color = entry.mode === "selected" ? selectionColor : hoverColor;
        entry.object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) {
            return;
          }
          const geometry = new THREE.EdgesGeometry(mesh.geometry, 1);
          const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: entry.mode === "selected" ? 1 : 0.55,
          });
          const edges = new THREE.LineSegments(geometry, material);
          edges.name = "velora.highlight";
          mesh.add(edges);
          highlights.push({ object: edges, geometry, material });
        });
      }
    },
    get selectionColor() {
      return selectionColor;
    },
    dispose() {
      clearHighlights();
      for (const material of cache.values()) {
        material.dispose();
      }
      cache.clear();
    },
    size: () => cache.size,
  };
}

/** Fundo do palco: `--canvas` do documento CSS, sem cor paralela. */
export function backgroundFrom(readToken: (name: string) => string | null): THREE.Color {
  return colorFrom(readToken, "--canvas", "#f6f4f0");
}

/** Tokens consumidos por um documento — usado pelo palco para saber o que tem de reler no tema. */
export function documentThemeTokens(document: SceneDocument): readonly string[] {
  const ids = new Set<MaterialId>();
  for (const element of document.elements) {
    ids.add(element.materialId);
  }
  return [...ids].map((id) => MATERIALS[id].colorToken);
}
