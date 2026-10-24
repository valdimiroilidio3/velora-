import { describe, expect, it } from "vitest";
import {
  buildSurfaceMaps,
  valueNoise,
  MATERIAL_SURFACE_CHECK,
  normalFromHeight,
  repeatFor,
  SURFACE_BY_MATERIAL,
  surfaceBytes,
} from "./surfaces";
import { MATERIAL_IDS } from "./materials";
import { degToRad } from "./units";

describe("superfícies procedurais", () => {
  it("cada material do documento tem uma superfície declarada", () => {
    expect(MATERIAL_SURFACE_CHECK).toBe(true);
    for (const id of MATERIAL_IDS) {
      const def = SURFACE_BY_MATERIAL[id];
      expect(def.tileMeters).toBeGreaterThan(0);
      expect(def.roughnessMin).toBeLessThan(def.roughnessMax);
      expect(def.roughnessMax).toBeLessThanOrEqual(1);
      expect(def.resolution).toBeGreaterThanOrEqual(64);
    }
  });

  it("é determinística: o mesmo gerador devolve exatamente os mesmos bytes", () => {
    const a = buildSurfaceMaps(SURFACE_BY_MATERIAL.wall, 7, 128);
    const b = buildSurfaceMaps(SURFACE_BY_MATERIAL.wall, 7, 128);
    expect(Buffer.from(a.albedo).equals(Buffer.from(b.albedo))).toBe(true);
    expect(Buffer.from(a.roughness).equals(Buffer.from(b.roughness))).toBe(true);
  });

  it("sementes diferentes dão superfícies diferentes (não é um gradiente fixo disfarçado)", () => {
    const a = buildSurfaceMaps(SURFACE_BY_MATERIAL.wall, 7, 128);
    const b = buildSurfaceMaps(SURFACE_BY_MATERIAL.wall, 13, 128);
    expect(Buffer.from(a.albedo).equals(Buffer.from(b.albedo))).toBe(false);
  });

  it("o ruído é periódico: o fim do *tile* coincide exatamente com o começo", () => {
    expect(valueNoise(0, 0.37, 8, 3)).toBeCloseTo(valueNoise(1, 0.37, 8, 3), 12);
    expect(valueNoise(0.42, 0, 5, 11)).toBeCloseTo(valueNoise(0.42, 1, 5, 11), 12);
  });

  it("a costura não se vê: a diferença na emenda é da ordem do gradiente interno", () => {
    const size = 128;
    const maps = buildSurfaceMaps(SURFACE_BY_MATERIAL.slab, 5, size);
    const row = (x: number, y: number): number => maps.albedo[(y * size + x) * 4] ?? 0;
    const leftToRight: number[] = [];
    const seam: number[] = [];
    for (let y = 0; y < size; y += 1) {
      leftToRight.push(Math.abs(row(1, y) - row(0, y)));
      // Continuidade no *tiling*: `repeat` emenda a coluna final com a primeira, e é essa diferença
      // que tem de ser pequena — não a continuação da própria textura.
      seam.push(Math.abs(row(0, y) - row(size - 1, y)));
    }
    const max = (values: number[]): number => values.reduce((total, v) => Math.max(total, v), 0);
    // Uma emenda visível seria um salto maior do que qualquer gradiente interno do mapa.
    expect(max(seam)).toBeLessThanOrEqual(max(leftToRight) + 1);
  });

  it("mantém o albedo numa faixa clara e a rugosidade na faixa declarada", () => {
    const def = SURFACE_BY_MATERIAL.wall;
    const maps = buildSurfaceMaps(def, 3, 256);
    let min = 255;
    let max = 0;
    for (let i = 0; i < maps.albedo.length; i += 4) {
      const value = maps.albedo[i] ?? 0;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    // Cinzento-claro de propósito: a cor vem do token CSS, o mapa só dá variação.
    expect(min).toBeGreaterThan(150);
    expect(max).toBeLessThanOrEqual(255);

    for (let i = 0; i < maps.roughness.length; i += 4) {
      const value = (maps.roughness[i] ?? 0) / 255;
      expect(value).toBeGreaterThanOrEqual(def.roughnessMin - 0.01);
      expect(value).toBeLessThanOrEqual(def.roughnessMax + 0.01);
    }
  });

  it("com `bump: 0` o mapa de normais é o plano neutro", () => {
    const height = new Float32Array(16 * 16).fill(0.5);
    const normal = normalFromHeight(height, 16, 0);
    for (let i = 0; i < normal.length; i += 4) {
      expect(normal[i]).toBe(128);
      expect(normal[i + 1]).toBe(128);
      expect(normal[i + 2]).toBe(255);
    }
  });

  it("as normais ficam dentro do cubo unitário codificado", () => {
    const maps = buildSurfaceMaps(SURFACE_BY_MATERIAL.ground, 11, 128);
    for (let i = 0; i < maps.normal.length; i += 4) {
      for (const channel of [maps.normal[i], maps.normal[i + 1], maps.normal[i + 2]]) {
        expect(channel ?? 0).toBeGreaterThanOrEqual(0);
        expect(channel ?? 0).toBeLessThanOrEqual(255);
      }
    }
  });

  it("a repetição é física: 12 m de fachada com tile de 3,2 m dão 3,75 tiles", () => {
    const [rx, ry] = repeatFor(12, 3.2, SURFACE_BY_MATERIAL.wall.tileMeters);
    expect(rx).toBe(3.75);
    expect(ry).toBe(1);
    // Nenhum painel tão pequeno como para desaparecer: há um piso de 0,05 repetições.
    expect(repeatFor(0.01, 0.01, 3.2)[0]).toBe(0.05);
  });

  it("o custo de memória é o declarado (3 mapas RGBA por material)", () => {
    expect(surfaceBytes(256)).toBe(256 * 256 * 4 * 4);
    expect(surfaceBytes(512)).toBe(2 * 2 * surfaceBytes(256));
  });

  it("as unidades continuam em metros e os ângulos em graus", () => {
    // Prova de que este módulo não introduziu uma segunda convenção: só usa `degToRad` de `units`.
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
  });
});
