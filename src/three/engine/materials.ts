import * as THREE from "three";
import { MATERIALS } from "../materials";
import type { MaterialId, SceneDocument } from "../model";

/**
 * Materiais Three.js construídos a partir de `MATERIALS` (os parâmetros vivem fora de `three`,
 * ver `src/three/materials.ts`).
 *
 * O registo é **por chave de material**, não por elemento: um edifício com 400 paredes usa um
 * material, não 400. É isso que mantém as trocas de estado do GPU baixas e o `dispose()` honesto.
 *
 * Cores vêm sempre dos tokens CSS (`--scene-*`, `--accent`): `readToken` é injetado precisamente
 * para que o teste em Node, sem CSS, possa alimentar cores fixas.
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
}

function colorFrom(readToken: (name: string) => string | null, token: string, fallback: string): THREE.Color {
  const raw = readToken(token);
  return new THREE.Color(raw !== null && raw.length > 0 ? raw : fallback);
}

export function createMaterialRegistry(options: MaterialRegistryOptions): MaterialRegistry {
  const cache = new Map<MaterialId, THREE.MeshStandardMaterial>();
  const read = options.readToken;
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
      material.needsUpdate = true;
    }
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
      material.name = `velora.material.${id}`;
      cache.set(id, material);
      return material;
    },
    refresh: applyColors,
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
