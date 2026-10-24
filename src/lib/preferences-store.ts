"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  applyPreferences,
  defaultPreferences,
  parsePreferences,
  PREFERENCES_STORAGE_KEY,
  serializePreferences,
  type Preferences,
} from "./preferences";

/**
 * Store global mínimo (sem dependências): suficiente para 4 preferências partilhadas
 * por cabeçalho, barra lateral e cena. Reagir por contexto seria o próximo passo se
 * o estado local crescesse; não antecipamos um gerenciador de estado.
 */

const listeners = new Set<() => void>();
let snapshot: Preferences = defaultPreferences;
let hydrated = false;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function read(): Preferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }
  try {
    return parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
  } catch {
    return defaultPreferences;
  }
}

function mediaMatches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

function sync(): void {
  if (typeof document === "undefined") {
    return;
  }
  applyPreferences(document.documentElement, snapshot, {
    systemPrefersDark: mediaMatches("(prefers-color-scheme: dark)"),
    systemPrefersReduced: mediaMatches("(prefers-reduced-motion: reduce)"),
  });
}

function hydrate(): Preferences {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  return snapshot;
}

export const preferencesStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Preferences {
    return hydrate();
  },
  getServerSnapshot(): Preferences {
    return defaultPreferences;
  },
  update(patch: Partial<Preferences>): void {
    const next = { ...snapshot, ...patch };
    if (
      next.theme === snapshot.theme &&
      next.density === snapshot.density &&
      next.motion === snapshot.motion &&
      next.sceneQuality === snapshot.sceneQuality
    ) {
      return;
    }
    snapshot = next;
    hydrated = true;
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, serializePreferences(snapshot));
    } catch {
      // Armazenamento indisponível (modo privado, quota): as preferências valem para a sessão.
    }
    sync();
    emit();
  },
  reset(): void {
    this.update({ ...defaultPreferences });
  },
  /** Religa o efeito colateral (tema/densidade no DOM) a partir do estado atual. */
  apply(): void {
    hydrate();
    sync();
  },
  watchSystem(): () => void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return () => undefined;
    }
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Emitir também: os componentes derivados do sinal do sistema (movimento, tema) têm de
    // re-renderizar quando o sistema muda, não só o <html>.
    const onChange = () => {
      sync();
      emit();
    };
    dark.addEventListener("change", onChange);
    reduced.addEventListener("change", onChange);
    return () => {
      dark.removeEventListener("change", onChange);
      reduced.removeEventListener("change", onChange);
    };
  },
};

export type PrefKey = keyof Preferences;

/**
 * Sinais já resolvidos pelo `applyPreferences`: ler do `<html>` evita duplicar a resolução
 * de `system` em cada componente e garante que todos veem exatamente o mesmo valor.
 */
export function useVisualSignals(): { reducedMotion: boolean; resolvedTheme: "light" | "dark" } {
  const { preferences } = usePreferences();
  void preferences; // dependência de re-render: qualquer alteração às preferências re-lê o DOM
  if (typeof document === "undefined") {
    return { reducedMotion: false, resolvedTheme: "light" };
  }
  return {
    reducedMotion: document.documentElement.dataset["motion"] === "reduced",
    resolvedTheme: document.documentElement.dataset["theme"] === "dark" ? "dark" : "light",
  };
}

export function usePreferences(): {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
  set: <K extends PrefKey>(key: K, value: Preferences[K]) => void;
} {
  const preferences = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
    preferencesStore.getServerSnapshot,
  );

  const update = useCallback((patch: Partial<Preferences>) => preferencesStore.update(patch), []);
  const reset = useCallback(() => preferencesStore.reset(), []);
  const set = useCallback(<K extends PrefKey>(key: K, value: Preferences[K]) => {
    preferencesStore.update({ [key]: value } as Partial<Preferences>);
  }, []);

  return { preferences, update, reset, set };
}
