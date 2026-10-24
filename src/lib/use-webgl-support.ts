"use client";

import { useSyncExternalStore } from "react";
import { detectWebgl, type WebglSupport } from "./webgl";

let cached: WebglSupport | null = null;

/**
 * Detecção de WebGL lida como *external store*.
 *
 * Fazer disto um `useState` dentro de um efeito produz um render em cascata (o browser pinta
 * primeiro o estado "a verificar"); um `useState` inicializado durante o render produz
 * divergência entre o HTML do servidor e o da hidratação. `useSyncExternalStore` é o mecanismo
 * do React para "valor que só existe no cliente": o servidor usa `getServerSnapshot` e a
 * reconciliação passa ao valor real a seguir à hidratação, sem flicker de estado intermédio.
 */
function subscribe(): () => void {
  return () => undefined;
}

function getSnapshot(): WebglSupport {
  if (cached === null) {
    cached = detectWebgl();
  }
  return cached;
}

function getServerSnapshot(): WebglSupport {
  return "unknown";
}

export function useWebglSupport(): WebglSupport {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test hook: permite repetir a detecção entre casos de teste. */
export function resetWebglSupportCache(): void {
  cached = null;
}
