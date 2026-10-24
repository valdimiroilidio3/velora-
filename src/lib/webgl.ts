/**
 * Detecção de capacidade WebGL.
 *
 * Deliberadamente defensivo: qualquer exceção é tratada como "não suportado". O objetivo
 * não é perguntar se o browser *conhece* WebGL, mas se conseguimos criar um contexto e
 * desenhá-lo — hardware bloqueado, `about:config` restrito, GPU em modo seguro e
 * "desativar aceleração de hardware" entram todos no mesmo ramo de alternativa visual.
 */

export type WebglSupport = "supported" | "unavailable" | "unknown";

export function detectWebgl(): WebglSupport {
  if (typeof document === "undefined") {
    return "unknown";
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (gl === null) {
      return "unavailable";
    }
    // Perder o contexto de teste imediatamente: não deixamos uma ligação GPU órfã
    // apenas por termos perguntado se existia.
    const loseContext = gl.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    return "supported";
  } catch {
    return "unavailable";
  }
}

/** Dispositivos com toque e ecrã pequeno: menos amostragem, menos poder de GPU. */
export function isConstrainedDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 720;
  const lowMemory =
    typeof navigator !== "undefined" &&
    navigator.hardwareConcurrency !== undefined &&
    navigator.hardwareConcurrency <= 4;
  return (coarse && small) || lowMemory;
}
