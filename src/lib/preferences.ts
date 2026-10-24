/**
 * Preferências visuais do utilizador (tema, densidade, movimento, qualidade de cena).
 *
 * Fronteira de responsabilidade: este módulo é puramente local (localStorage) e
 * determinístico. Não há persistência de servidor nem sincronização entre
 * dispositivos — isso pertence à Fase 1, quando existir sessão real, e passa a
 * escrever-se aqui (o contrato `Preferences` é o mesmo).
 */

export const PREFERENCES_STORAGE_KEY = "velora.preferences.v1";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type Density = "comfortable" | "compact";
export type MotionChoice = "system" | "reduced";
export type SceneQuality = "auto" | "detailed" | "balanced";

export interface Preferences {
  theme: ThemeChoice;
  density: Density;
  motion: MotionChoice;
  sceneQuality: SceneQuality;
}

export const defaultPreferences: Preferences = {
  theme: "system",
  density: "comfortable",
  motion: "system",
  sceneQuality: "auto",
};

const themeChoices = new Set<ThemeChoice>(["system", "light", "dark"]);
const densities = new Set<Density>(["comfortable", "compact"]);
const motions = new Set<MotionChoice>(["system", "reduced"]);
const qualities = new Set<SceneQuality>(["auto", "detailed", "balanced"]);

function pick<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

/** Tolerante a dados corrompidos/antigos: nunca rebenta, devolve sempre um objeto válido. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) {
    return { ...defaultPreferences };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...defaultPreferences };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ...defaultPreferences };
  }
  const source = parsed as Record<string, unknown>;
  return {
    theme: pick(source["theme"], themeChoices, defaultPreferences.theme),
    density: pick(source["density"], densities, defaultPreferences.density),
    motion: pick(source["motion"], motions, defaultPreferences.motion),
    sceneQuality: pick(source["sceneQuality"], qualities, defaultPreferences.sceneQuality),
  };
}

export function serializePreferences(preferences: Preferences): string {
  return JSON.stringify(preferences);
}

export function resolveTheme(theme: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return theme;
}

export function isMotionReduced(motion: MotionChoice, systemPrefersReduced: boolean): boolean {
  return motion === "reduced" || (motion === "system" && systemPrefersReduced);
}

/**
 * Aplica as preferências ao documento. Chamado por `ThemeScript` (antes da hidratação,
 * para não haver flash) e pelo store reativo quando o utilizador altera algo.
 */
export function applyPreferences(
  root: HTMLElement,
  preferences: Preferences,
  signals: { readonly systemPrefersDark: boolean; readonly systemPrefersReduced: boolean },
): void {
  root.dataset["theme"] = resolveTheme(preferences.theme, signals.systemPrefersDark);
  root.dataset["themeChoice"] = preferences.theme;
  root.dataset["density"] = preferences.density;
  root.dataset["motion"] = isMotionReduced(preferences.motion, signals.systemPrefersReduced)
    ? "reduced"
    : "full";
}
