import { normalizeDegrees, type Vec3 } from "./units";

/**
 * *Presets* de iluminação (`Fase 4`).
 *
 * São **números de domínio**, não estilo: o motor lê-os e muda luzes, exposição e ambiente. Por isso
 * vivem fora do `three` e por isso os rótulos estão no catálogo `i18n` — um *preset* que só muda a
 * cor de um botão é o que o pedido desta fase proíbe explicitamente.
 *
 * Convenção geométrica (a mesma do documento, `units.ts`): metros, `+Y` para cima, norte em `-Z`.
 * O azimute é medido **a partir do norte, no sentido dos ponteiros do relógio** (0 = norte, 90 =
 * nascente/este, 180 = sul, 270 = poente). A elevação é o ângulo acima do horizonte.
 */

export type LightingPresetId = "manha" | "meio-dia" | "fim-de-tarde" | "noite";

export const LIGHTING_PRESET_IDS: readonly LightingPresetId[] = [
  "manha",
  "meio-dia",
  "fim-de-tarde",
  "noite",
] as const;

export interface LightingPreset {
  readonly id: LightingPresetId;
  readonly sunAzimuthDeg: number;
  readonly sunElevationDeg: number;
  /** Cor do sol em sRGB; `#000000` + intensidade 0 = sem sol (noite). */
  readonly sunColor: string;
  readonly sunIntensity: number;
  readonly fillColor: string;
  readonly fillIntensity: number;
  readonly skyColor: string;
  readonly groundColor: string;
  readonly hemiIntensity: number;
  /** `renderer.toneMappingExposure`. */
  readonly exposure: number;
  /** Força do ambiente (*IBL*) — é o que faz o vidro e o metal terem reflexo. */
  readonly envIntensity: number;
  readonly shadows: boolean;
  /** Liga os brilhos interiores (`SURFACE_BY_MATERIAL[*].nightEmissive`). */
  readonly night: boolean;
  /** *Tint* do fundo do palco, multiplicado sobre o token `--canvas` do tema. */
  readonly backgroundTint: string;
}

export const LIGHTING_PRESETS: Readonly<Record<LightingPresetId, LightingPreset>> = {
  manha: {
    id: "manha",
    sunAzimuthDeg: 78,
    sunElevationDeg: 24,
    sunColor: "#fff1dc",
    sunIntensity: 2.1,
    fillColor: "#cfe0f0",
    fillIntensity: 0.34,
    skyColor: "#dce8f5",
    groundColor: "#b8b0a2",
    hemiIntensity: 0.85,
    exposure: 1.02,
    envIntensity: 0.75,
    shadows: true,
    night: false,
    backgroundTint: "#f4f6f7",
  },
  "meio-dia": {
    id: "meio-dia",
    sunAzimuthDeg: 180,
    sunElevationDeg: 62,
    sunColor: "#ffffff",
    sunIntensity: 2.6,
    fillColor: "#e8eef4",
    fillIntensity: 0.28,
    skyColor: "#e9f1f8",
    groundColor: "#c9c2b5",
    hemiIntensity: 1,
    exposure: 0.95,
    envIntensity: 0.9,
    shadows: true,
    night: false,
    backgroundTint: "#f7f8f8",
  },
  "fim-de-tarde": {
    id: "fim-de-tarde",
    sunAzimuthDeg: 268,
    sunElevationDeg: 9,
    sunColor: "#ffc48a",
    sunIntensity: 1.9,
    fillColor: "#9fb3cf",
    fillIntensity: 0.4,
    skyColor: "#c8d3e2",
    groundColor: "#8d8274",
    hemiIntensity: 0.6,
    exposure: 1.12,
    envIntensity: 0.55,
    shadows: true,
    night: false,
    backgroundTint: "#efe7de",
  },
  noite: {
    id: "noite",
    sunAzimuthDeg: 300,
    sunElevationDeg: 32,
    sunColor: "#000000",
    sunIntensity: 0,
    // Lua cheia ≈ 0,05–0,3 lx na horizontal; aqui é a luz de preenchimento da cena, não um valor de iluminância.
    fillColor: "#8ea6c8",
    fillIntensity: 0.5,
    skyColor: "#1e2a3d",
    groundColor: "#151821",
    hemiIntensity: 0.32,
    exposure: 1.45,
    envIntensity: 0.3,
    shadows: false,
    night: true,
    backgroundTint: "#14171d",
  },
};

/**
 * Direção **do** sol (do centro do lote para o astro), unitária, nos eixos do documento.
 *
 * A conversão é feita aqui em ponto flutuante cru e não com `degToRad`: essa função arredonda para
 * cinco decimais porque é a resolução *armazenada* no documento, e um ângulo arredondado antes do
 * `cos`/`sin` dá um vetor que deixa de ter comprimento 1 — que é exatamente o que um teste de
 * direção da luz tem de poder afirmar.
 */
export function sunDirection(preset: LightingPreset): Vec3 {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const az = toRadians(normalizeDegrees(preset.sunAzimuthDeg));
  const el = toRadians(Math.max(-89, Math.min(89, preset.sunElevationDeg)));
  const horizontal = Math.cos(el);
  // norte = -Z ⇒ azimute 0 aponta para -Z; 90º (nascente) aponta para +X.
  return [Math.sin(az) * horizontal, Math.sin(el), -Math.cos(az) * horizontal];
}

/** Posição da luz-chave para o *preset*, à distância `radius` do centro do lote. */
export function keyLightPosition(preset: LightingPreset, radius: number): Vec3 {
  const [dx, dy, dz] = sunDirection(preset);
  const r = Math.max(1, radius);
  return [dx * r, Math.max(r * 0.08, dy * r), dz * r];
}

/**
 * Gradiente do céu para o *environment* do palco, em linhas horizontais (0 = zénite, 1 = nadir).
 *
 * É a fonte do *image-based lighting*: o motor gera um *equirectangular* de 64×32 a partir daqui,
 * sem descarregar HDRI nenhum. Um céu procedural não substitui uma captura real — é o que permite
 * que vidro e metal tenham algo coerente para refletir, mudando com o *preset*.
 */
export function skyRowLinear(preset: LightingPreset, v: number): Vec3 {
  const zenith = mix(hexToLinear(preset.skyColor), hexToLinear(preset.sunColor), 0.18);
  const horizon = hexToLinear(preset.skyColor);
  const ground = hexToLinear(preset.groundColor);
  const above = v < 0.5;
  // O horizonte é sempre a faixa mais clara do céu (espalhimento), e o solo a mais escura.
  const t = above ? 1 - v / 0.5 : (v - 0.5) / 0.5;
  const top = mix(horizon, zenith, Math.pow(t, 0.7));
  const row = above ? top : mix(horizon, ground, Math.pow(t, 0.5));
  return row;
}

function hexToLinear(hex: string): Vec3 {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  // sRGB → linear (aproximação por potência, que é o que o shader faria com `SRGBColorSpace`).
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface SkyEquirect {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
  /** Azimute/elevação do disco solar, para o *highlight* do *environment*. */
  readonly sun: Vec3;
  readonly sunStrength: number;
}

/**
 * Mapa equiretangular do *preset* (RGBA 8 bits, valores em sRGB *encoded* — o motor marca
 * `SRGBColorSpace` e o PMREM trata do resto). O disco do sol entra como *blob* suave, porque um
 * *highlight* sem origem define a direção da luz no material e é o que faz uma fachada ler-se
 * como solada ou sombreada.
 */
export function buildSkyEquirect(preset: LightingPreset, width = 64, height = 32): SkyEquirect {
  const w = Math.max(8, Math.floor(width));
  const h = Math.max(4, Math.floor(height));
  const rgba = new Uint8Array(w * h * 4);
  const [sx, sy, sz] = sunDirection(preset);
  const sunAz = Math.atan2(sx, -sz);
  const sunEl = Math.asin(Math.max(-1, Math.min(1, sy)));
  const strength = preset.sunIntensity > 0 ? Math.min(1, preset.sunIntensity / 3) : 0.12;

  for (let y = 0; y < h; y += 1) {
    const row = skyRowLinear(preset, (y + 0.5) / h);
    const el = (0.5 - (y + 0.5) / h) * Math.PI;
    for (let x = 0; x < w; x += 1) {
      const az = ((x + 0.5) / w) * Math.PI * 2 - Math.PI;
      const dAz = Math.abs(((az - sunAz + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const dEl = el - sunEl;
      const glow = strength * Math.exp(-(dAz * dAz + dEl * dEl) / 0.28);
      const i = (y * w + x) * 4;
      rgba[i] = clampByte(row[0] + glow);
      rgba[i + 1] = clampByte(row[1] + glow * 0.92);
      rgba[i + 2] = clampByte(row[2] + glow * 0.78);
      rgba[i + 3] = 255;
    }
  }
  return { width: w, height: h, rgba, sun: [sx, sy, sz], sunStrength: strength };
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}
