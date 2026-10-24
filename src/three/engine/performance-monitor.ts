import { mm } from "../units";

/**
 * `PerformanceMonitor`: contadores de palco, em modo de desenvolvimento.
 *
 * É deliberadamente um objeto pequeno e puro: recebe o delta de tempo e as contagens do renderer e
 * devolve uma amostra. Não sabe o que é React nem Three.js, por isso pode ser testado (e é) sem
 * browser — que é a única forma honesta de existir neste ambiente, onde não há GPU para medir.
 *
 * O que **não** faz: não mostra um FPS "esperado", não suaviza para parecer melhor, e não guarda
 * histórico em memória sem limite.
 */

export interface RenderInfo {
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly meshes?: number | undefined;
}

export interface PerformanceSample extends RenderInfo {
  readonly fps: number;
  readonly frameMs: number;
  readonly drawnFrames: number;
  readonly idleFrames: number;
  /** Percentagem de frames de render que foram pedidos por interação (o resto é amortecimento). */
  readonly demandShare: number;
}

export const DEFAULT_SAMPLE_WINDOW = 30;

export interface PerformanceMonitor {
  sample(deltaSeconds: number, info: RenderInfo, kind: "demand" | "damping"): void;
  read(): PerformanceSample;
  /** Média dos últimos N `frameMs`, para um texto de estado estável a ler. */
  worstFrameMs(): number;
  reset(): void;
}

export function createPerformanceMonitor(window = DEFAULT_SAMPLE_WINDOW): PerformanceMonitor {
  const history: number[] = [];
  let lastInfo: RenderInfo = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  let emaMs = 0;
  let drawn = 0;
  let damped = 0;
  let worst = 0;

  return {
    sample(deltaSeconds, info, kind) {
      const frameMs = Math.max(0, deltaSeconds * 1000);
      history.push(frameMs);
      if (history.length > window) {
        history.shift();
      }
      // EMA com α = 0,12: reage ao que mudou sem tremer a cada frame.
      emaMs = emaMs === 0 ? frameMs : emaMs * 0.88 + frameMs * 0.12;
      worst = Math.max(worst, frameMs);
      if (kind === "demand") {
        drawn += 1;
      } else {
        damped += 1;
      }
      // As contagens do renderer chegam por parâmetro: o monitor não segura referências ao GPU.
      lastInfo = info;
    },
    read() {
      const total = drawn + damped;
      return {
        fps: emaMs > 0 ? Math.round(1000 / emaMs) : 0,
        frameMs: mm(emaMs),
        calls: lastInfo.calls,
        triangles: lastInfo.triangles,
        geometries: lastInfo.geometries,
        textures: lastInfo.textures,
        meshes: lastInfo.meshes,
        drawnFrames: drawn,
        idleFrames: damped,
        demandShare: total === 0 ? 1 : Math.round((drawn / total) * 100) / 100,
      };
    },
    worstFrameMs() {
      return mm(worst);
    },
    reset() {
      history.length = 0;
      emaMs = 0;
      drawn = 0;
      damped = 0;
      worst = 0;
      lastInfo = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
    },
  };
}

export function formatSample(sample: PerformanceSample): string {
  const meshes = sample.meshes === undefined ? "" : ` · ${String(sample.meshes)} malhas`;
  return `${String(sample.fps)} fps · ${String(sample.frameMs)} ms · ${String(sample.triangles)} tris · ${String(sample.calls)} draws${meshes}`;
}
