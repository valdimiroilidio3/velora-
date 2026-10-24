import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyPlanIllustration } from "@/components/ui/empty-state";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

export default function WorkspaceNotFound(): ReactNode {
  return (
    <div className="mx-auto grid max-w-2xl gap-5 py-10 text-center">
      <div className="mx-auto grid w-full max-w-xs place-items-center rounded-lg border border-line bg-canvas-sunken p-5">
        <EmptyPlanIllustration size={130} />
      </div>
      <p className="tabular text-2xs uppercase tracking-[0.18em] text-ink-muted">rota inexistente · 404</p>
      <h1 className="font-display text-3xl leading-tight">Esta página não faz parte da Fase 2.</h1>
      <p className="mx-auto max-w-[48ch] text-sm text-ink-muted">
        O espaço de trabalho tem quatro superfícies com implementação. Se um link interno te trouxe até aqui,
        considera-o um defeito e reporta-nos no repositório.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Link href="/app" className={buttonClass("primary", "md")}>
          {ui.actions.back}
        </Link>
        <Link href="/app/projetos" className={buttonClass("secondary", "md")}>
          {ui.nav.projects}
        </Link>
      </div>
    </div>
  );
}
