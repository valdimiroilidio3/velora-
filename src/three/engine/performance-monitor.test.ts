import { describe, expect, it } from "vitest";
import { createPerformanceMonitor, formatSample } from "./performance-monitor";

const info = (
  overrides: Partial<{
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    meshes: number;
  }> = {},
) => ({ calls: 4, triangles: 48, geometries: 12, textures: 0, meshes: 12, ...overrides }) as never;

describe("monitor de desempenho", () => {
  it("converte o delta em fps sem inventar nada", () => {
    const monitor = createPerformanceMonitor(4);
    monitor.sample(1 / 60, info(), "demand");
    const sample = monitor.read();
    expect(sample.fps).toBe(60);
    expect(sample.frameMs).toBeCloseTo(16.667, 2);
  });

  it("suaviza por média móvel exponencial e não pelo último frame", () => {
    const monitor = createPerformanceMonitor(10);
    for (let index = 0; index < 10; index += 1) {
      monitor.sample(1 / 60, info(), "demand");
    }
    monitor.sample(1 / 10, info(), "demand");
    const after = monitor.read().fps;
    expect(after).toBeLessThan(60);
    expect(after).toBeGreaterThan(10);
    // Um frame mau não pode fazer o número saltar para 10 fps: isso seria um contador inútil.
    expect(after).toBeGreaterThan(30);
  });

  it("distingue frames pedidos de frames de amortecimento", () => {
    const monitor = createPerformanceMonitor();
    monitor.sample(1 / 60, info(), "demand");
    monitor.sample(1 / 60, info(), "demand");
    monitor.sample(1 / 60, info(), "damping");
    const sample = monitor.read();
    expect(sample.drawnFrames).toBe(2);
    expect(sample.idleFrames).toBe(1);
    expect(sample.demandShare).toBeCloseTo(0.67, 2);
  });

  it("passa as contagens do renderer sem guardar referências", () => {
    const monitor = createPerformanceMonitor();
    monitor.sample(1 / 60, info({ calls: 7, triangles: 84, meshes: 21 }), "demand");
    expect(monitor.read()).toMatchObject({ calls: 7, triangles: 84, meshes: 21, geometries: 12 });
  });

  it("o reset volta ao estado zero, não ao último valor", () => {
    const monitor = createPerformanceMonitor();
    monitor.sample(1 / 20, info(), "demand");
    expect(monitor.read().fps).toBe(20);
    monitor.reset();
    const zero = monitor.read();
    expect(zero.fps).toBe(0);
    expect(zero.drawnFrames).toBe(0);
    expect(monitor.worstFrameMs()).toBe(0);
    monitor.sample(1 / 30, info(), "demand");
    expect(monitor.read().fps).toBe(30);
  });

  it("registra o pior frame para o estado poder ser lido a texto", () => {
    const monitor = createPerformanceMonitor();
    monitor.sample(1 / 60, info(), "demand");
    monitor.sample(1 / 4, info(), "demand");
    monitor.sample(1 / 60, info(), "demand");
    expect(monitor.worstFrameMs()).toBeCloseTo(250, 0);
  });

  it("formata para o HUD sem texto decorativo", () => {
    const monitor = createPerformanceMonitor();
    monitor.sample(1 / 50, info({ calls: 3, triangles: 36, meshes: 9 }), "demand");
    expect(formatSample(monitor.read())).toBe("50 fps · 20 ms · 36 tris · 3 draws · 9 malhas");
  });
});
