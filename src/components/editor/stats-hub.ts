/**
 * Ponte de estatísticas entre o palco e o HUD.
 *
 * O motor emite a ~2,5 Hz; ligar isso ao estado do `EditorView` faria re-renderizar a árvore
 * inteira (centenas de nós) quatro vezes por segundo por causa de um número. O hub é um store
 * mínimo de um só valor: escreve quem renderiza, lê quem mostra. É o mesmo padrão do
 * `preferencesStore`, com muito menos superfície porque só vive enquanto o palco vive.
 */
export interface StageStats {
  readonly fps: number;
  readonly frameMs: number;
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly meshes: number;
  readonly drawnFrames: number;
}

export interface StatsHub {
  push(stats: StageStats): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): StageStats | null;
  clear(): void;
}

export function createStatsHub(): StatsHub {
  let snapshot: StageStats | null = null;
  const listeners = new Set<() => void>();
  return {
    push(stats) {
      snapshot = stats;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    clear() {
      if (snapshot === null) {
        return;
      }
      snapshot = null;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}
