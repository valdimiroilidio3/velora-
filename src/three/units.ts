/**
 * Convenção de unidades do motor 3D — a única definição autorizada disto no projeto.
 *
 *  · **1 unidade de mundo = 1 metro** (sem escala intermédia, sem "10 unidades = 1 m").
 *  · **Y para cima** (`up = (0,1,0)`, que é também o default do Three.js).
 *  · **X → poente/leste**: +X é **nascente** (direita em planta).
 *  · **Z → norte/sul**: −Z é **norte** (cima em planta); o norte do projeto é o eixo −Z, e o
 *    `orientationDeg` do edifício roda em torno de Y no sentido anti-horário visto de cima.
 *  · **Origem (0,0,0)**: centroide do terreno do projeto, ao nível do **solo acabado do piso 0**
 *    (nível de implantação do logradouro). Lajes têm `position.y` = cotas absolutas desse nível;
 *    o terreno fica em `y = −0,15` para não produzir co-planaridade (Z-fighting).
 *  · Cotas de projeto são `elevationM` (extradorso do piso); pé-direito útil é `heightM` do nível.
 *  · Rotações internas em **radianos**; a interface e o documento usam **graus** (`*Deg`) e
 *    convertem nestas funções — nunca "à mão" nos componentes.
 *  · Comprimentos são arredondados a **milímetros** (3 decimais) na geração, para que a
 *    serialização, as etiquetas e a cena mostrem exatamente o mesmo número.
 */

export const UNITS_PER_METER = 1;
export const UP_AXIS = "Y" as const;
export const NORTH_AXIS = "-Z" as const;
export const ORIGIN_DESCRIPTION = "centroide do terreno, ao nível do solo acabado do piso 0" as const;

/** Identificador da convenção, escrito no documento: um ficheiro importado sem este valor é rejeitado. */
export const UNIT_CONVENTION_ID = "velora.meters.y-up.v1" as const;

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

/** Sufixo de milímetros: tudo o que sai da geração passa por aqui. */
export function mm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Normaliza um ângulo em graus para [0, 360) com 1 casa decimal — usado nas etiquetas. */
/**
 * Rotação em torno de Y no sentido anti-horário visto de cima (a mesma convenção do `Object3D`
 * do Three.js e do `place()` do gerador): `x' = x·cos θ + z·sin θ`, `z' = −x·sin θ + z·cos θ`.
 * Exportada daqui porque é aritmética de convenção, não detalhe de renderização.
 */
export function rotateY(vector: Vec3, degrees: number): Vec3 {
  if (degrees === 0) {
    return vector;
  }
  const angle = degToRad(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [mm(vector[0] * cos + vector[2] * sin), vector[1], mm(-vector[0] * sin + vector[2] * cos)];
}

export function normalizeDegrees(degrees: number): number {
  const value = ((degrees % 360) + 360) % 360;
  return Math.round(value * 10) / 10;
}

/** Etiqueta de cota no estilo de desenho: `+3,000` / `−1,500` em metros. */
export function levelLabel(elevationM: number): string {
  const sign = elevationM < 0 ? "−" : "+";
  return `${sign}${Math.abs(elevationM).toFixed(3).replace(".", ",")} m`;
}

/** Medida legível para o painel de propriedades: `6,20 × 2,80 × 0,25 m`. */
export function dimensionLabel(size: Vec3): string {
  return size.map((value) => mm(value).toFixed(2).replace(".", ",")).join(" × ") + " m";
}

/** Área de vão/horizontal, com a vírgula decimal portuguesa. */
export function areaLabel(squareMeters: number): string {
  return `${Math.round(squareMeters * 100) / 100} m²`.replace(".", ",");
}

export function volumeLabel(cubicMeters: number): string {
  return `${Math.round(cubicMeters * 10) / 10} m³`.replace(".", ",");
}
