/**
 * Leitura de custom properties do documento.
 *
 * O motor 3D não sabe o que é CSS — recebe uma função. Este módulo é o único ponto onde o
 * `getComputedStyle` aparece, o que mantém o `three/` testável em Node com cores fixas.
 */
export function readCssToken(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.length > 0 ? raw : null;
}
