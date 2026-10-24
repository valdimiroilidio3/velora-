import { describe, expect, it } from "vitest";
import {
  buildSkyEquirect,
  keyLightPosition,
  LIGHTING_PRESETS,
  LIGHTING_PRESET_IDS,
  skyRowLinear,
  sunDirection,
} from "./lighting-presets";

const length = (v: readonly number[]): number => Math.hypot(...v);

describe("presets de iluminação", () => {
  it("existem os quatro e são o que a UI mostra", () => {
    expect([...LIGHTING_PRESET_IDS]).toEqual(["manha", "meio-dia", "fim-de-tarde", "noite"]);
    for (const id of LIGHTING_PRESET_IDS) {
      const preset = LIGHTING_PRESETS[id];
      expect(preset.id).toBe(id);
      expect(preset.exposure).toBeGreaterThan(0.5);
      expect(preset.exposure).toBeLessThan(2);
      expect(preset.envIntensity).toBeGreaterThan(0);
      expect(preset.hemiIntensity).toBeGreaterThanOrEqual(0);
    }
  });

  it("a direção do sol é unitária e segue a convenção (norte = -Z, +Y em cima)", () => {
    for (const id of LIGHTING_PRESET_IDS) {
      const dir = sunDirection(LIGHTING_PRESETS[id]);
      expect(length(dir)).toBeCloseTo(1, 8);
    }
    // Nascente (azimute 90) ⇒ +X; norte (0) ⇒ -Z; zénite (elevação 90) ⇒ +Y.
    expect(
      sunDirection({ ...LIGHTING_PRESETS["meio-dia"], sunAzimuthDeg: 90, sunElevationDeg: 0 })[0],
    ).toBeCloseTo(1, 8);
    expect(
      sunDirection({ ...LIGHTING_PRESETS["meio-dia"], sunAzimuthDeg: 0, sunElevationDeg: 0 })[2],
    ).toBeCloseTo(-1, 8);
  });

  it("manhã e fim de tarde estão em lados opostos do céu, e o meio-dia é a luz mais alta", () => {
    expect(sunDirection(LIGHTING_PRESETS.manha)[0]).toBeGreaterThan(0);
    expect(sunDirection(LIGHTING_PRESETS["fim-de-tarde"])[0]).toBeLessThan(0);
    expect(LIGHTING_PRESETS["meio-dia"].sunElevationDeg).toBeGreaterThan(
      LIGHTING_PRESETS.manha.sunElevationDeg,
    );
    expect(LIGHTING_PRESETS["meio-dia"].sunElevationDeg).toBeGreaterThan(
      LIGHTING_PRESETS["fim-de-tarde"].sunElevationDeg,
    );
  });

  it("à noite não há sol: intensidade zero, sombras desligadas, brilhos ligados", () => {
    const night = LIGHTING_PRESETS.noite;
    expect(night.sunIntensity).toBe(0);
    expect(night.shadows).toBe(false);
    expect(night.night).toBe(true);
    expect(night.skyColor).not.toBe(LIGHTING_PRESETS["meio-dia"].skyColor);
  });

  it("a posição da luz-chave fica acima do lote e à distância pedida", () => {
    for (const id of LIGHTING_PRESET_IDS) {
      const [x, y, z] = keyLightPosition(LIGHTING_PRESETS[id], 40);
      expect(y).toBeGreaterThan(3);
      expect(Math.hypot(x, y, z)).toBeGreaterThanOrEqual(40 * 0.9);
    }
  });

  it("o céu é mais escuro do zénite para o solo e a noite é escura em toda a faixa", () => {
    const day = LIGHTING_PRESETS["meio-dia"];
    const zenith = skyRowLinear(day, 0.02);
    const ground = skyRowLinear(day, 0.98);
    expect(zenith[0] + zenith[1] + zenith[2]).toBeGreaterThan(ground[0] + ground[1] + ground[2]);

    const rows = [0.05, 0.45, 0.55, 0.95].map((v) => {
      const [r, g, b] = skyRowLinear(LIGHTING_PRESETS.noite, v);
      return r + g + b;
    });
    for (const value of rows) {
      expect(value).toBeLessThan(1.2);
    }
  });

  it("o equiretangular tem o tamanho pedido e um realce junto ao sol", () => {
    const sky = buildSkyEquirect(LIGHTING_PRESETS.manha, 64, 32);
    expect(sky.width).toBe(64);
    expect(sky.height).toBe(32);
    expect(sky.rgba.length).toBe(64 * 32 * 4);
    // O *blob* solar tem de estar no mapa: sem ele, reflexos não têm direção.
    let max = 0;
    for (let i = 0; i < sky.rgba.length; i += 4) {
      max = Math.max(max, sky.rgba[i] ?? 0);
    }
    expect(max).toBe(255);
    const noon = buildSkyEquirect(LIGHTING_PRESETS["meio-dia"], 64, 32);
    expect(Buffer.from(sky.rgba).equals(Buffer.from(noon.rgba))).toBe(false);
  });
});
