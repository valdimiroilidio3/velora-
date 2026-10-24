import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isNavItemActive, navGroups, navItems } from "./nav";

/**
 * Este teste é a prova mecânica de uma das regras do prompt: «não criar rotas decorativas».
 * Em vez de confiar na revisão, verifica o sistema de ficheiros:
 *   · tudo o que é link tem de ter `page.tsx` (ou `route.ts`) no caminho correspondente;
 *   · tudo o que está marcado como fase NÃO pode ter página (senão é um link para o nada).
 */

const APP_ROOT = join(fileURLToPath(new URL("../", import.meta.url)), "app");

function pageExistsForHref(href: string): boolean {
  const segments = href.split("/").filter(Boolean);
  const dir = join(APP_ROOT, ...segments);
  if (!existsSync(dir)) {
    return false;
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  const hasPage = entries.some((entry) => entry.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(entry.name));
  if (hasPage) {
    return true;
  }
  // `not-found.tsx` sozinho não conta como rota: precisa de um segmento próprio com page.
  return entries.some((entry) => entry.isDirectory() && entry.name.startsWith("["));
}

describe("modelo de navegação", () => {
  it("todos os links apontam para uma rota que existe no repositório", () => {
    const links = navItems.filter((item) => item.phase === undefined);
    expect(links.length).toBeGreaterThan(0);
    const missing = links.filter((item) => !pageExistsForHref(item.href)).map((item) => item.href);
    expect(missing).toEqual([]);
  });

  it("itens de fase não têm rota implementada (nem página, nem link)", () => {
    const planned = navItems.filter((item) => item.phase !== undefined);
    expect(planned.length).toBeGreaterThan(0);
    const implemented = planned.filter((item) => pageExistsForHref(item.href)).map((item) => item.href);
    expect(implemented).toEqual([]);
  });

  it("cada item de fase declara para quando é", () => {
    for (const item of navItems.filter((entry) => entry.phase !== undefined)) {
      expect(item.phase).toMatch(/^Fase \d/);
      expect(item.hint?.length).toBeGreaterThan(10);
    }
  });

  it("não há etiquetas repetidas nem grupos vazios", () => {
    const labels = navItems.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const group of navGroups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("o estado ativo é por segmento, não por prefixo de texto", () => {
    const projects = navItems.find((item) => item.href === "/app/projetos");
    if (projects === undefined) throw new Error("entrada /app/projetos em falta na navegação");
    expect(isNavItemActive(projects, "/app/projetos")).toBe(true);
    expect(isNavItemActive(projects, "/app/projetos/mares-do-casal")).toBe(true);
    // "projetos-novos" partilha prefixo de string e não é a mesma rota.
    expect(isNavItemActive(projects, "/app/projetos-novos")).toBe(false);
    const overview = navItems.find((item) => item.href === "/app");
    if (overview === undefined) throw new Error("entrada /app em falta na navegação");
    expect(isNavItemActive(overview, "/app")).toBe(true);
    expect(isNavItemActive(overview, "/app/preferencias")).toBe(false);
  });
});
