"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n/pt";
import { AppNav } from "./app-nav";
import { AppHeader } from "./app-header";
import { DemoBadge } from "@/components/ui/demo-badge";
import { cn } from "@/lib/cn";

function Brand(): ReactNode {
  return (
    <Link
      href="/app"
      className="group flex items-baseline gap-2 rounded-sm px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="font-display text-lg leading-none tracking-[-0.02em] text-ink">VELORA</span>
      <span className="text-2xs text-ink-muted transition-opacity duration-150 group-hover:text-ink-muted">
        espaço de trabalho
      </span>
    </Link>
  );
}

function RailFooter(): ReactNode {
  return (
    <div className="grid gap-2 border-t border-line px-4 py-3.5">
      <DemoBadge />
      <p className="text-2xs leading-relaxed text-ink-muted">
        Sessão simulada para validar a interface. Não há autenticação, persistência nem isolamento por
        organização nesta fase.
      </p>
    </div>
  );
}

/**
 * Estrutura da aplicação: barra lateral fixa em `lg`, gaveta acessível abaixo disso.
 *
 * Nota de honestidade: o shell é *estrutural*. A área `/app/**` não está protegida por
 * sessão — a proteção real (middleware + RLS) é a Fase 1, ver docs/SECURITY.md §2-§3.
 */
export function AppShell({ children }: { readonly children: ReactNode }): ReactNode {
  const [navOpen, setNavOpen] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        toggleRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // O foco entra no diálogo: sem isto, Tab continuaria a percorrer a página por baixo.
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  // Fechar a gaveta quando a janela passa para o intervalo em que a barra lateral já é visível.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const wide = window.matchMedia("(min-width: 64rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setNavOpen(false);
      }
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={cn("min-h-dvh lg:grid lg:grid-cols-[var(--rail-width)_minmax(0,1fr)]")}>
      <aside
        id="navegacao-principal"
        className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas-sunken/55 lg:flex"
      >
        <div className="flex h-[var(--header-height)] items-center border-b border-line px-4">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          <AppNav />
        </div>
        <RailFooter />
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" ref={toggleRef}>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar navegação"
            onClick={closeNav}
            className="absolute inset-0 h-full w-full cursor-default bg-scrim"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal"
            tabIndex={-1}
            className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-line bg-canvas shadow-e3 outline-none"
          >
            <div className="flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-line px-4">
              <Brand />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  closeNav();
                  toggleRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
                }}
                aria-label={ui.actions.closeMenu}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
              <AppNav onNavigate={closeNav} />
            </div>
            <RailFooter />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <AppHeader navOpen={navOpen} onToggleNav={() => setNavOpen((value) => !value)} />
        <main id="conteudo" className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-shell">{children}</div>
        </main>
        <footer className="border-t border-line px-4 py-4 text-2xs text-ink-muted sm:px-6 lg:px-8">
          <p>
            VELORA · Fase 2 — estrutura de aplicação e design system. Rotas com estado de implementação na
            página{" "}
            <Link href="/app/preferencias" className="underline underline-offset-2 hover:text-ink-secondary">
              Preferências
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
