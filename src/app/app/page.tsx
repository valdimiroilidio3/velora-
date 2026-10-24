import Link from "next/link";
import { ArrowUpRight, Boxes, Database, Layers, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PlanDrawing } from "@/components/projects/plan-drawing";
import { buttonClass } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-badge";
import { EmptyPlanIllustration } from "@/components/ui/empty-state";
import { ProjectStatusPill, statusOrder } from "@/components/ui/status-pill";
import { buildMassing } from "@/demo/massing";
import { demoProjects, demoUser, projectUnitTotals } from "@/demo/projects";
import { summarizeProjects } from "@/demo/query";
import { formatRelative } from "@/lib/format";
import { ui } from "@/i18n/pt";

const ENTRIES = [
  {
    href: "/app/projetos",
    label: "Catálogo de demonstração",
    description: "Pesquisa, filtro por estado e ordenação. O estado vive no URL.",
    Icon: Layers,
  },
  {
    href: "/app/cena",
    label: "Cena arquitetónica",
    description: "Volumes em WebGL com alternativa vetorial quando não há GPU.",
    Icon: Boxes,
  },
  {
    href: "/app/preferencias",
    label: "Preferências visuais",
    description: "Tema, densidade, movimento e qualidade de cena, locais ao navegador.",
    Icon: SlidersHorizontal,
  },
] as const;

const BOUNDARIES = [
  ["Persistência", "Sem base de dados: os seis projetos vivem em `src/demo/projects.ts`."],
  ["Autenticação", "O cabeçalho mostra um perfil fictício; não há sessão nem cookies."],
  ["Edição", "Nada é gravado. As ações de escrita aparecem desativadas com a fase de destino."],
  ["IA e BIM", "Marcados como indisponíveis na navegação: criar a rota vazia seria fingir capacidade."],
] as const;

export default function WorkspaceOverviewPage() {
  const summary = summarizeProjects(demoProjects);
  const recent = [...demoProjects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).at(0);
  const recentMassing = recent ? buildMassing(recent.scene) : null;
  const totals = recent ? projectUnitTotals(recent) : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Espaço de trabalho"
        title="Visão geral"
        description={`Sessão de demonstração de ${demoUser.name} (${demoUser.role}). Os números vêm do conjunto de demonstração e são recalculados em cada render.`}
        meta={
          <>
            <span className="tabular">
              {summary.total} projetos · {summary.availableUnits}/{summary.totalUnits} frações disponíveis
            </span>
            <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden="true" />
            <span className="tabular">
              última atualização: {summary.lastUpdated === null ? "—" : formatRelative(summary.lastUpdated)}
            </span>
          </>
        }
        actions={
          <Link href="/app/projetos" className={buttonClass("primary", "md")}>
            {ui.actions.open}
          </Link>
        }
      />

      <DemoNotice />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <section aria-labelledby="indicatores" className="surface-card overflow-hidden">
            <h2 id="indicatores" className="border-b border-line px-4 py-2.5 text-sm font-semibold">
              Estado do catálogo de demonstração
            </h2>
            <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
              {statusOrder.map((status) => {
                const value =
                  status === "published"
                    ? summary.published
                    : status === "in_review"
                      ? summary.inReview
                      : status === "draft"
                        ? summary.draft
                        : summary.archived;
                return (
                  <div key={status} className="grid content-start gap-2 bg-surface px-4 py-3.5">
                    <dt>
                      <ProjectStatusPill status={status} />
                    </dt>
                    <dd className="tabular font-display text-3xl leading-none">
                      {String(value).padStart(2, "0")}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <nav
            aria-label="Entradas da aplicação"
            className="grid gap-px overflow-hidden rounded-lg border border-line bg-line"
          >
            {ENTRIES.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="group flex flex-wrap items-center gap-3 bg-surface px-4 py-3.5 transition-colors duration-150 ease-quart-out hover:bg-canvas-sunken/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-canvas-sunken text-ink-secondary transition-colors duration-150 group-hover:border-accent/40 group-hover:text-accent"
                >
                  <entry.Icon className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-ink-muted">{entry.description}</span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink-muted transition-transform duration-150 ease-quart-out group-hover:-translate-y-px group-hover:text-accent"
                />
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid content-start gap-6">
          {recent && recentMassing ? (
            <section aria-labelledby="ultimo" className="surface-card overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5">
                <h2 id="ultimo" className="text-sm font-semibold">
                  Atualizado mais recentemente
                </h2>
                <span className="tabular text-2xs text-ink-muted">{formatRelative(recent.updatedAt)}</span>
              </div>
              <div className="blueprint-grid bg-canvas-sunken p-3">
                <div className="rounded-md border border-line bg-surface p-2">
                  <PlanDrawing
                    massing={recentMassing}
                    role="figure"
                    label={`Planta esquemática do último piso de ${recent.name}`}
                    className="aspect-[4/3] w-full"
                  />
                </div>
              </div>
              <div className="grid gap-2 px-4 py-3">
                <p className="text-sm font-medium">{recent.name}</p>
                <p className="text-xs text-ink-muted">
                  {recent.city}, {recent.region} · {recentMassing.levels.length} pisos ·{" "}
                  {totals === null ? "—" : `${totals.available}/${totals.total} frações livres`}
                </p>
                <Link
                  href={`/app/projetos/${recent.slug}`}
                  className={buttonClass("secondary", "sm", { className: "justify-self-start" })}
                >
                  Abrir ficha
                </Link>
              </div>
            </section>
          ) : (
            <div className="surface-card grid justify-items-center gap-3 p-6 text-center">
              <EmptyPlanIllustration />
              <p className="text-sm text-ink-muted">{ui.projects.empty.noData}</p>
            </div>
          )}

          <section aria-labelledby="limites" className="surface-card overflow-hidden">
            <h2
              id="limites"
              className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold"
            >
              <Database aria-hidden="true" className="size-4 text-ink-muted" />
              Limites desta versão
            </h2>
            <dl className="grid gap-px bg-line">
              {BOUNDARIES.map(([term, definition]) => (
                <div key={term} className="grid gap-1 bg-surface px-4 py-3">
                  <dt className="text-xs font-semibold text-ink">{term}</dt>
                  <dd className="text-xs text-ink-muted">{definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <aside className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          A barra lateral lista módulos que ainda não existem (membros, leads, planos, geração por IA) como
          itens desativados com a fase de destino. Não são atalhos partidos: são o perímetro acordado — ver{" "}
          <code className="font-mono text-2xs">docs/PRODUCT-SPEC.md</code>.
        </p>
      </aside>
    </div>
  );
}
