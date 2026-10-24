import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleDashed, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesForm } from "@/components/layout/preferences-form";
import { DemoNotice } from "@/components/ui/demo-badge";
import { ui } from "@/i18n/pt";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Preferências",
  description: "Tema, densidade, movimento e qualidade de cena. Guardados neste navegador, sem servidor.",
};

type State = "shipped" | "partial" | "planned";

const ROUTES: readonly { href: string; label: string; state: State; note: string }[] = [
  { href: "/", label: "Apresentação", state: "shipped", note: "páginas estáticas, sem dados externos" },
  {
    href: "/acesso",
    label: "Acesso",
    state: "partial",
    note: "validação de cliente; autenticação real é Fase 1",
  },
  {
    href: "/app",
    label: "Visão geral",
    state: "shipped",
    note: "métricas derivadas do conjunto de demonstração",
  },
  {
    href: "/app/projetos",
    label: "Projetos",
    state: "shipped",
    note: "pesquisa, filtro, ordenação e duas vistas",
  },
  {
    href: "/app/projetos/mares-do-casal",
    label: "Ficha de projeto",
    state: "shipped",
    note: "tipologias, cena, planta e limites declarados",
  },
  {
    href: "/app/cena",
    label: "Cena 3D",
    state: "shipped",
    note: "volume paramétrico com alternativa vetorial",
  },
  {
    href: "/app/preferencias",
    label: "Preferências",
    state: "partial",
    note: "locais ao navegador; sem sincronização",
  },
  {
    href: "/app/membros",
    label: "Membros e papéis",
    state: "planned",
    note: "Fase 1 — item de navegação desativado",
  },
  { href: "/app/leads", label: "Leads", state: "planned", note: "Fase 5" },
  { href: "/app/planos", label: "Planos e ativação", state: "planned", note: "Fase 5" },
  { href: "/app/generacao", label: "Geração por IA", state: "planned", note: "Fase 3" },
] as const;

const STATES: Record<State, { Icon: typeof Check; className: string; label: string }> = {
  shipped: { Icon: Check, className: "text-success", label: "implementado e testado nesta fase" },
  partial: { Icon: CircleDashed, className: "text-info", label: "funciona, com âmbito limitado" },
  planned: { Icon: TriangleAlert, className: "text-warning", label: "sem rota: não é um link" },
};

function StateIcon({ state }: { readonly state: State }): ReactNode {
  const { Icon, className } = STATES[state];
  return <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", className)} />;
}

export default function PreferencesPage(): ReactNode {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Conta"
        title={ui.nav.preferences}
        description="Escolhas que alteram a renderização — tema, densidade, movimento e detalhe da cena — mais o mapa honesto do que existe em cada rota."
      />

      <DemoNotice />

      <PreferencesForm />

      <section aria-labelledby="rotas" className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 id="rotas" className="text-sm font-semibold">
            Estado de implementação por rota
          </h2>
          <ul className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
            {(Object.keys(STATES) as State[]).map((state) => (
              <li key={state} className="flex items-center gap-1.5">
                <StateIcon state={state} />
                {STATES[state].label}
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid gap-px bg-line">
          {ROUTES.map((route) => (
            <li
              key={route.href}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface px-4 py-2.5"
              title={STATES[route.state].label}
            >
              <StateIcon state={route.state} />
              <span className="text-sm font-medium text-ink">{route.label}</span>
              {route.state === "planned" ? (
                <span className="font-mono text-2xs text-ink-muted">{route.href}</span>
              ) : (
                <Link
                  href={route.href}
                  className="rounded-sm font-mono text-2xs text-ink-secondary underline decoration-line underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {route.href}
                </Link>
              )}
              <span className="ml-auto text-2xs text-ink-muted">{route.note}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2.5 text-2xs text-ink-muted">
          Itens de navegação sem rota não são links: aparecem desativados com a fase de destino, para que o
          produto não pareça ter o que ainda não tem.
        </p>
      </section>
    </div>
  );
}
