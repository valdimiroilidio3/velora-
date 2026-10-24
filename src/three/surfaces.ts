import { MATERIAL_IDS } from "./materials";
import type { MaterialId } from "./model";
import { mm } from "./units";

/**
 * Definições de superfície e o gerador de mapas procedurais (`Fase 4`).
 *
 * Porque procedural e não ficheiros: a aplicação não pode depender de URLs externas para os seus
 * recursos essenciais, não há browser nem acesso a repositórios de texturas neste ambiente, e uma
 * textura de 2 MB por material entraria no *bundle* ou numa rede que não controlamos. Um mapa
 * gerado por aritmética (a) não precisa de licença nem de *fetch*, (b) é determinístico e por isso
 * **testável em Node**, (c) pode ser reamostrado por qualidade, (d) liberta-se com um `dispose()`.
 *
 * O que isto não é: não é PBR capturado, não tem *albedo* validado em laboratório nem mapas de
 * curvatura/oclusão de um *bake* offline. É uma superfície de visualização arquitetónica — os
 * números de rugosidade são os de referência do setor, os de *tiling* são físicos.
 *
 * O *albedo* é cinzento-claro com variação, nunca cor: a cor continua a vir do token CSS
 * (`--scene-*`) através de `MeshStandardMaterial.color`, que **multiplica** o mapa. Manter isto é o
 * que impede o motor de se tornar a segunda paleta do projeto (`ADR 0003`).
 */

export type SurfaceFinish =
  "concrete" | "plaster" | "glass" | "metal" | "wood" | "stone" | "grass" | "paving" | "membrane";

export interface SurfaceDef {
  readonly finish: SurfaceFinish;
  /** Lado do *tile* em metros. Escala física: 1 repetição ≠ "quanto parecer bem". */
  readonly tileMeters: number;
  /** Lado do mapa em píxeis (256 = equilibrada, 512 = detalhada). */
  readonly resolution: number;
  /** Amplitude da variação no albedo (0 = liso). */
  readonly contrast: number;
  readonly roughnessMin: number;
  readonly roughnessMax: number;
  /** Força do mapa de normais derivado do campo de altura (0 = sem relevo). */
  readonly bump: number;
  /** Estiramento horizontal do ruído: betão escorrido, perfis, tábuas. */
  readonly streak: number;
  /** Periodicidade do *grão* fino sobreposta ao ruído de grande escala. */
  readonly grain: number;
  /** Brilho interior do material quando a presets de luz é `noite`. */
  readonly nightEmissive: number;
  readonly emissiveColor: string;
}

const TILE = {
  concrete: {
    tileMeters: 2.4,
    contrast: 0.22,
    roughnessMin: 0.62,
    roughnessMax: 0.94,
    bump: 0.5,
    streak: 0.55,
    grain: 0.5,
  },
  plaster: {
    tileMeters: 3.2,
    contrast: 0.12,
    roughnessMin: 0.78,
    roughnessMax: 0.97,
    bump: 0.32,
    streak: 0.1,
    grain: 0.9,
  },
  glass: {
    tileMeters: 6,
    contrast: 0.05,
    roughnessMin: 0.02,
    roughnessMax: 0.12,
    bump: 0.04,
    streak: 0.8,
    grain: 0.1,
  },
  metal: {
    tileMeters: 1.6,
    contrast: 0.1,
    roughnessMin: 0.28,
    roughnessMax: 0.52,
    bump: 0.16,
    streak: 0.9,
    grain: 0.35,
  },
  wood: {
    tileMeters: 0.9,
    contrast: 0.3,
    roughnessMin: 0.42,
    roughnessMax: 0.7,
    bump: 0.42,
    streak: 0.95,
    grain: 0.7,
  },
  stone: {
    tileMeters: 1.2,
    contrast: 0.26,
    roughnessMin: 0.6,
    roughnessMax: 0.92,
    bump: 0.55,
    streak: 0.2,
    grain: 0.8,
  },
  grass: {
    tileMeters: 0.8,
    contrast: 0.34,
    roughnessMin: 0.86,
    roughnessMax: 1,
    bump: 0.6,
    streak: 0,
    grain: 1,
  },
  paving: {
    tileMeters: 0.6,
    contrast: 0.2,
    roughnessMin: 0.68,
    roughnessMax: 0.95,
    bump: 0.5,
    streak: 0.1,
    grain: 0.7,
  },
  membrane: {
    tileMeters: 4,
    contrast: 0.08,
    roughnessMin: 0.7,
    roughnessMax: 0.9,
    bump: 0.12,
    streak: 0.4,
    grain: 0.3,
  },
} as const satisfies Record<
  SurfaceFinish,
  Omit<SurfaceDef, "finish" | "resolution" | "nightEmissive" | "emissiveColor">
>;

function surface(
  finish: SurfaceFinish,
  resolution: number,
  night: { readonly nightEmissive: number; readonly emissiveColor: string } = {
    nightEmissive: 0,
    emissiveColor: "#000000",
  },
): SurfaceDef {
  return { finish, resolution, ...TILE[finish], ...night };
}

/** Uma superfície por chave de material — o `MaterialId` do documento é a chave estável. */
export const SURFACE_BY_MATERIAL: Readonly<Record<MaterialId, SurfaceDef>> = {
  ground: surface("grass", 512),
  platform: surface("paving", 512),
  slab: surface("concrete", 512),
  wall: surface("plaster", 512),
  partition: surface("plaster", 256),
  door: surface("wood", 256),
  // O vidro do rés-do-chão acende de noite; o de fachada típica reflete apenas.
  glazing: surface("glass", 256, { nightEmissive: 0.55, emissiveColor: "#ffd8a0" }),
  roof: surface("membrane", 256),
  core: surface("concrete", 256),
  furniture: surface("wood", 256, { nightEmissive: 0.22, emissiveColor: "#ffe2b4" }),
};

export interface SurfaceMaps {
  readonly size: number;
  readonly finish: SurfaceFinish;
  /** RGBA, espaço sRGB — multiplicado pela cor do token no *shader*. */
  readonly albedo: Uint8Array;
  /** RGBA cinzento, linear — `roughnessMap` lê o canal G. */
  readonly roughness: Uint8Array;
  /** RGBA, linear — tangente do campo de altura. */
  readonly normal: Uint8Array;
  /** Altura crua, guardada para o mapa de relevo poder ser reamostrado sem regenerar o ruído. */
  readonly height: Float32Array;
}

/**
 * *Hash* inteiro de 32 bits. `Math.imul` em vez de `*`: o resultado de `a * b` em ponto flutuante
 * perde os bits baixos para lá de 2^53, e um gerador que depende disso não é reprodutível.
 */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function wrapped(v: number, period: number): number {
  const m = v % period;
  return m < 0 ? m + period : m;
}

/**
 * Ruído de valor com período inteiro em cada eixo ⇒ **costuras contínuas**. Sem isto, um `repeat`
 * de 20× num edifício mostra uma grelha de emendas, que é o aspeto mais facilmente reconhecível de
 * textura mal aplicada em arquitetura.
 */
/** Exportada para o teste de periodicidade: é a propriedade que faz o `repeat` não mostrar emenda. */
export function valueNoise(u: number, v: number, period: number, seed: number): number {
  const gx = u * period;
  const gy = v * period;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const n00 = hash2(wrapped(x0, period), wrapped(y0, period), seed);
  const n10 = hash2(wrapped(x0 + 1, period), wrapped(y0, period), seed);
  const n01 = hash2(wrapped(x0, period), wrapped(y0 + 1, period), seed);
  const n11 = hash2(wrapped(x0 + 1, period), wrapped(y0 + 1, period), seed);
  const a = n00 + (n10 - n00) * fx;
  const b = n01 + (n11 - n01) * fx;
  return a + (b - a) * fy;
}

/** 4 oitavas: período duplicado e amplitude reduzida a metade — o *fractal* usual de superfície. */
function fbm(u: number, v: number, basePeriod: number, seed: number, streak: number): number {
  let sum = 0;
  let amplitude = 0.5;
  let period = basePeriod;
  let total = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    // O `streak` estica o ruído no eixo X: escorrimentos verticais, tábuas, perfis.
    const px = Math.max(1, Math.round(period * (1 - streak * 0.7)));
    sum +=
      valueNoise(u, v, px, seed + octave * 101) *
      amplitude *
      valueNoise(u, v, period, seed + 37 + octave * 17);
    total += amplitude;
    amplitude *= 0.5;
    period *= 2;
  }
  return total === 0 ? 0 : sum / total;
}

/**
 * Gera os três mapas de uma superfície. `size` é o lado em píxeis; os *buffers* são `size²`
 * (RGBA) e o campo de altura fica à parte para poder ser reamostrado.
 */
export function buildSurfaceMaps(def: SurfaceDef, seed = 7, size?: number): SurfaceMaps {
  const n = Math.max(64, Math.min(1024, size ?? def.resolution));
  const albedo = new Uint8Array(n * n * 4);
  const roughness = new Uint8Array(n * n * 4);
  const height = new Float32Array(n * n);
  const period = 4;

  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const u = x / n;
      const v = y / n;
      const large = fbm(u, v, period, seed, def.streak);
      const fine =
        def.grain > 0 ? valueNoise(u, v, Math.max(4, Math.round(n / 4)), seed + 991) * def.grain : 0;
      const h = Math.max(0, Math.min(1, large * 0.82 + fine * 0.18));
      height[y * n + x] = h;

      const shade = 1 - def.contrast * (0.5 - h) * 2;
      const value = Math.max(0, Math.min(255, Math.round(232 * shade)));
      const i = (y * n + x) * 4;
      albedo[i] = value;
      albedo[i + 1] = value;
      albedo[i + 2] = value;
      albedo[i + 3] = 255;

      const rough = h * (def.roughnessMax - def.roughnessMin) + def.roughnessMin;
      const rv = Math.max(0, Math.min(255, Math.round(rough * 255)));
      roughness[i] = rv;
      roughness[i + 1] = rv;
      roughness[i + 2] = rv;
      roughness[i + 3] = 255;
    }
  }

  return {
    size: n,
    finish: def.finish,
    albedo,
    roughness,
    normal: normalFromHeight(height, n, def.bump),
    height,
  };
}

/**
 * Mapa de normais em espaço tangente por diferenças centrais do campo de altura (Sobel simples).
 * `strength = 0` devolve o plano neutro `(128, 128, 255)`, que é o que "sem relevo" significa aqui.
 */
export function normalFromHeight(height: Float32Array, n: number, strength: number): Uint8Array {
  const normal = new Uint8Array(n * n * 4);
  const at = (x: number, y: number): number => height[wrapped(y, n) * n + wrapped(x, n)] ?? 0;

  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * 4;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 4;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * n + x) * 4;
      normal[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      normal[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      normal[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      normal[i + 3] = 255;
    }
  }
  return normal;
}

/**
 * Repetição física de um mapa num painel de `widthM × heightM`: quantos *tiles* cabem em cada eixo,
 * arredondado ao centímetro para que dois painéis iguais tenham exatamente o mesmo recorte.
 */
export function repeatFor(widthM: number, heightM: number, tileMeters: number): readonly [number, number] {
  const safeTile = Math.max(0.1, tileMeters);
  return [mm(Math.max(0.05, widthM / safeTile)), mm(Math.max(0.05, heightM / safeTile))];
}

/** invariantes de consistência usados pelo teste (exportado para não duplicar a lista em `test`). */
export const MATERIAL_SURFACE_CHECK: boolean = MATERIAL_IDS.every(
  (id) => SURFACE_BY_MATERIAL[id] !== undefined,
);

/** Custo em memória dos mapas de um material — entra no orçamento declarado do palco. */
export function surfaceBytes(size: number): number {
  return size * size * 4 * 4;
}
