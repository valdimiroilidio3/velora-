import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, vi } from "vitest";

// Em jsdom, `import.meta.url` não é um URL de ficheiro: o caminho resolve-se a partir da raiz
// do projeto, que é o `cwd` do Vitest.
const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
import {
  applyPreferences,
  defaultPreferences,
  parsePreferences,
  PREFERENCES_STORAGE_KEY,
  type Preferences,
} from "./preferences";
import { preferencesStore } from "./preferences-store";

/**
 * Preferências no meio real (jsdom): o que o teste de Node não pode provar é que o
 * `applyPreferences` escreve no documento e que o store persiste sem rebentar.
 */

function snapshot(root: HTMLElement): Record<string, string | undefined> {
  return {
    theme: root.dataset["theme"],
    themeChoice: root.dataset["themeChoice"],
    density: root.dataset["density"],
    motion: root.dataset["motion"],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  for (const key of Object.keys(document.documentElement.dataset)) {
    delete document.documentElement.dataset[key];
  }
});

describe("applyPreferences", () => {
  it("escreve os quatro atributos de dados que o CSS lê", () => {
    applyPreferences(
      document.documentElement,
      { theme: "dark", density: "compact", motion: "system", sceneQuality: "auto" },
      {
        systemPrefersDark: false,
        systemPrefersReduced: true,
      },
    );
    expect(snapshot(document.documentElement)).toEqual({
      theme: "dark",
      themeChoice: "dark",
      density: "compact",
      motion: "reduced",
    });
  });

  it("deixa a resolução do sistema decidir quando a escolha é «system»", () => {
    applyPreferences(document.documentElement, defaultPreferences, {
      systemPrefersDark: true,
      systemPrefersReduced: false,
    });
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(document.documentElement.dataset["motion"]).toBe("full");
  });

  it("a densidade compacta altera o multiplicador usado pelos blocos de conteúdo", () => {
    applyPreferences(
      document.documentElement,
      { ...defaultPreferences, density: "compact" },
      {
        systemPrefersDark: false,
        systemPrefersReduced: false,
      },
    );
    // O valor vem do CSS ([data-density="compact"]); aqui só verificamos o gancho escrito.
    expect(document.documentElement.dataset["density"]).toBe("compact");
    expect(CSS).toMatch(/\[data-density="compact"\]\s*\{[^}]*--density-step:\s*0\.82/);
  });
});

describe("preferencesStore", () => {
  it("grava no localStorage e notifica os subscritores", () => {
    let notifications = 0;
    const unsubscribe = preferencesStore.subscribe(() => {
      notifications += 1;
    });
    preferencesStore.reset();
    notifications = 0;

    preferencesStore.update({ theme: "light" });
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(parsePreferences(stored).theme).toBe("light");
    expect(notifications).toBe(1);
    expect(document.documentElement.dataset["theme"]).toBe("light");
    unsubscribe();
  });

  it("não notifica quando a alteração é nula", () => {
    preferencesStore.update({ theme: "dark" });
    let notifications = 0;
    const unsubscribe = preferencesStore.subscribe(() => {
      notifications += 1;
    });
    preferencesStore.update({ theme: "dark" });
    expect(notifications).toBe(0);
    unsubscribe();
  });

  it("arranca com valores por omissão perante storage envenenada por outra versão da app", async () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, "tema=escuro");
    // Módulo novo: é o arranque de uma visita, não uma re-leitura a meio da sessão.
    vi.resetModules();
    const { preferencesStore: fresh } = await import("./preferences-store");
    const read: Preferences = fresh.getSnapshot();
    expect(read).toEqual(defaultPreferences);
  });

  it("mantém a preferência em memória quando o armazenamento está indisponível", () => {
    const original = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => preferencesStore.update({ density: "compact" })).not.toThrow();
    expect(preferencesStore.getSnapshot().density).toBe("compact");
    window.localStorage.setItem = original;
  });
});
