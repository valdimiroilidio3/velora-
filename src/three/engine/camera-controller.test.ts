import { describe, expect, it } from "vitest";
import { computeFraming, DISTANCE_LIMITS, PITCH_LIMITS, VIEW_PRESETS } from "./camera-controller";
import type { Bounds } from "../model";

const bounds: Bounds = { min: [-20, 0, -14], max: [20, 24, 14], center: [0, 12, 0], radius: 26 };

describe("enquadramento automático", () => {
  it("afasta a câmera o suficiente para o modelo caber inteiro", () => {
    const framing = computeFraming(bounds);
    expect(framing.distance).toBeGreaterThan(bounds.radius * DISTANCE_LIMITS.minFactor);
    // Ângulo vertical do enquadramento tem de cobrir o raio visto da distância escolhida.
    const halfAngle = Math.atan(bounds.radius / framing.distance);
    expect(halfAngle).toBeLessThan((38 / 2) * (Math.PI / 180) + 0.35);
  });

  it("põe o alvo no centroide do lote, não na origem do mundo", () => {
    const framing = computeFraming(bounds, 38, "perspetiva");
    expect(framing.target).toEqual([0, 12, 0]);
    expect(framing.position[1]).toBeGreaterThan(12);
  });

  it("respeita a semântica dos presets", () => {
    const top = computeFraming(bounds, 38, "superior");
    const front = computeFraming(bounds, 38, "frontal");
    const side = computeFraming(bounds, 38, "lateral");
    // Vista de cima: quase todo o deslocamento é em Y e quase nada em X/Z.
    expect(Math.abs(top.position[1] - top.target[1])).toBeGreaterThan(
      Math.abs(top.position[2] - top.target[2]) * 8,
    );
    // Alçado frontal olha ao longo de Z; lateral ao longo de X.
    expect(Math.abs(front.position[2] - front.target[2])).toBeGreaterThan(
      Math.abs(front.position[0] - front.target[0]),
    );
    expect(Math.abs(side.position[0] - side.target[0])).toBeGreaterThan(
      Math.abs(side.position[2] - side.target[2]),
    );
  });

  it("cobre os presets anunciados na interface", () => {
    expect(VIEW_PRESETS.map((preset) => preset.value)).toEqual([
      "perspetiva",
      "superior",
      "frontal",
      "lateral",
    ]);
  });

  it("não rebenta com um documento degenerado", () => {
    const degenerate: Bounds = { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 };
    const framing = computeFraming(degenerate);
    expect(Number.isFinite(framing.distance)).toBe(true);
    expect(framing.distance).toBeGreaterThan(0);
    expect(framing.position.every((value) => Number.isFinite(value))).toBe(true);
  });

  it("declara limites de órbita que não deixam perder o modelo", () => {
    expect(PITCH_LIMITS.minRad).toBeGreaterThan(0);
    expect(PITCH_LIMITS.maxRad).toBeLessThan(Math.PI / 2 + 0.1);
    expect(DISTANCE_LIMITS.maxFactor).toBeGreaterThan(DISTANCE_LIMITS.minFactor * 4);
  });
});
