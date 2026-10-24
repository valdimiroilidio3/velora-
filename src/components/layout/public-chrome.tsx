import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

export function BrandMark({
  href = "/",
  size = "md",
}: {
  readonly href?: string;
  readonly size?: "sm" | "md";
}): ReactNode {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <span
        aria-hidden="true"
        className={
          size === "sm"
            ? "grid size-7 place-items-center rounded-[4px] bg-accent text-xs font-semibold text-ink-on-accent"
            : "grid size-8 place-items-center rounded-[5px] bg-accent text-sm font-semibold text-ink-on-accent"
        }
      >
        V
      </span>
      <span className="grid leading-none">
        <span
          className={
            size === "sm"
              ? "text-sm font-semibold tracking-[0.16em]"
              : "text-base font-semibold tracking-[0.2em]"
          }
        >
          {ui.brand.name}
        </span>
        {size === "md" ? <span className="mt-1 text-2xs text-ink-muted">{ui.brand.tagline}</span> : null}
      </span>
    </Link>
  );
}

export function PublicHeader(): ReactNode {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="mx-auto flex w-full max-w-shell items-center gap-4 px-5 py-3.5 sm:px-8">
        <BrandMark />
        <nav
          aria-label="Página pública"
          className="ml-auto flex items-center gap-1 text-sm text-ink-secondary"
        >
          <Link
            href="#produto"
            className="hidden rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-canvas-sunken hover:text-ink sm:inline-flex"
          >
            Produto
          </Link>
          <Link
            href="#estado"
            className="hidden rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-canvas-sunken hover:text-ink sm:inline-flex"
          >
            Estado real
          </Link>
          <Link
            href="/app"
            className="rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-canvas-sunken hover:text-ink"
          >
            {ui.actions.tryDemo}
          </Link>
          <ThemeToggle />
          <Link href="/acesso" className={buttonClass("primary", "sm", { className: "ml-1" })}>
            {ui.actions.signIn}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter(): ReactNode {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-shell gap-3 px-5 py-8 text-xs text-ink-muted sm:grid-cols-2 sm:px-8">
        <p className="max-w-[52ch]">
          Protótipo de produto. Não há autenticação, persistência nem serviço externo: as páginas{" "}
          <code className="rounded-sm bg-canvas-sunken px-1 font-mono text-2xs">/app</code> correm apenas com
          dados fictícios no navegador e no render.
        </p>
        <p className="sm:text-right">
          Documentação de engenharia em <code className="font-mono text-2xs">docs/</code> — ARCHITECTURE,
          DESIGN-SYSTEM, QUALITY-GATES, SECURITY.
        </p>
      </div>
    </footer>
  );
}
