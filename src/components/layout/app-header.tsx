"use client";

import { PanelsTopLeft, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DemoBadge } from "@/components/ui/demo-badge";
import { initials } from "@/lib/format";
import { navItems } from "@/config/nav";
import { demoProjects, demoUser } from "@/demo/projects";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

interface Crumb {
  readonly label: string;
  readonly href?: string;
}

/** Breadcrumb derivado do caminho real — não existe uma lista paralela para esquecer de atualizar. */
function useBreadcrumb(): Crumb[] {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["app","projects","slug"]

  const crumbs: Crumb[] = [{ label: "Espaço de trabalho", href: "/app" }];
  let known = false;

  for (const [index, segment] of segments.entries()) {
    if (segment === "app") {
      continue;
    }
    const path = `/${segments.slice(0, index + 2).join("/")}`;
    const fromNav = navItems.find((item) => item.href === path);
    const project = demoProjects.find((item) => item.slug === segment);

    if (project !== undefined) {
      crumbs.push({ label: project.name });
      known = true;
    } else if (fromNav !== undefined) {
      crumbs.push({ label: fromNav.label, href: index === segments.length - 1 ? undefined : fromNav.href });
      known = true;
    } else {
      crumbs.push({ label: segment.replace(/-/g, " ") });
    }
  }

  if (crumbs.length === 1 && !known) {
    crumbs.push({ label: "Visão geral" });
  }
  return crumbs;
}

function Breadcrumb({ items }: { readonly items: readonly Crumb[] }): ReactNode {
  return (
    <nav aria-label="Localização na aplicação" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-xs text-ink-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.href !== undefined && !last ? (
                <Link
                  href={item.href}
                  className="truncate rounded-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="truncate font-medium text-ink-secondary"
                >
                  {item.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-ink-muted">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AppHeader({
  navOpen,
  onToggleNav,
}: {
  readonly navOpen: boolean;
  readonly onToggleNav: () => void;
}): ReactNode {
  const crumbs = useBreadcrumb();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-4 sm:px-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleNav}
          aria-expanded={navOpen}
          aria-controls="navegacao-principal"
          aria-label={navOpen ? ui.actions.closeMenu : ui.actions.openMenu}
          className="lg:hidden"
        >
          {navOpen ? <X /> : <PanelsTopLeft />}
        </Button>

        <Breadcrumb items={crumbs} />

        <div className="ml-auto flex items-center gap-2.5">
          <DemoBadge className="hidden sm:inline-flex" />
          <ThemeToggle />
          <span className="hidden items-center gap-2 border-l border-line pl-2.5 md:flex">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full border border-line-strong bg-canvas-sunken text-2xs font-semibold text-ink-secondary"
            >
              {initials(demoUser.name)}
            </span>
            <span className="grid leading-tight">
              <span className="text-xs font-medium text-ink">{demoUser.name}</span>
              <span className="text-2xs text-ink-muted">{demoUser.role} · demonstração</span>
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
