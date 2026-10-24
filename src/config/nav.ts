export type NavIcon =
  "overview" | "projects" | "scene" | "preferences" | "members" | "leads" | "billing" | "ai";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIcon;
  /** Quando definido, o item não é um link: está marcado como indisponível nesta fase. */
  readonly phase?: string;
  readonly hint?: string;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

/**
 * Modelo de navegação partilhado pela barra lateral e pelo menu móvel.
 * Os itens sem implementação aparecem desativados com a fase de destino: é mais honesto
 * do que criar rotas decorativas e mais útil do que omiti-los.
 */
export const navGroups: readonly NavGroup[] = [
  {
    label: "Espaço de trabalho",
    items: [
      { href: "/app", label: "Visão geral", icon: "overview" },
      { href: "/app/projetos", label: "Projetos", icon: "projects" },
      { href: "/app/cena", label: "Cena arquitetónica", icon: "scene" },
    ],
  },
  {
    label: "Preparação",
    items: [
      {
        href: "/app/membros",
        label: "Membros e papéis",
        icon: "members",
        phase: "Fase 1",
        hint: "Convida e classifica membros da organização.",
      },
      {
        href: "/app/leads",
        label: "Leads e contactos",
        icon: "leads",
        phase: "Fase 5",
        hint: "Pedidos vindos de páginas públicas e visitas.",
      },
      {
        href: "/app/planos",
        label: "Planos e ativação",
        icon: "billing",
        phase: "Fase 5",
        hint: "Planos por projeto com ativação manual.",
      },
      {
        href: "/app/generacao",
        label: "Geração por IA",
        icon: "ai",
        phase: "Fase 3",
        hint: "Texto, imagens e plantas → volumetria editável.",
      },
    ],
  },
  {
    label: "Conta",
    items: [{ href: "/app/preferencias", label: "Preferências", icon: "preferences" }],
  },
] as const;

export const navItems: readonly NavItem[] = navGroups.flatMap((group) => group.items);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
