"use client";

import { useSyncExternalStore } from "react";
import type { EditorState, EditorStore } from "./editor-store";

/**
 * Ligação React ao store do editor.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o snapshot é imutável e é o mesmo
 * objeto entre writes, por isso não há setState dentro de um efeito (que o ESLint de React 19
 * proíbe) nem risco de loop. O *server snapshot* é o estado inicial determinístico — o documento de
 * demonstração é gerado por aritmética pura, logo o HTML do servidor e o primeiro *render* do
 * navegador dizem exatamente o mesmo.
 */
export function useEditorStore(store: EditorStore): EditorState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
