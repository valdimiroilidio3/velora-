import type { Metadata } from "next";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectRow } from "@/components/projects/project-row";
import { ProjectToolbar } from "@/components/projects/project-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DemoNotice } from "@/components/ui/demo-badge";
import { EmptyPlanIllustration, EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { demoProjects } from "@/demo/projects";
import { filterProjects, isQueryActive, toProjectQuery, type RawSearchParams } from "@/demo/query";
import { ui } from "@/i18n/pt";

export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Catálogo de demonstração com pesquisa, filtro por estado e ordenação. Todos os empreendimentos são fictícios.",
};

function readView(raw: RawSearchParams): "grid" | "list" {
  const value = Array.isArray(raw["view"]) ? raw["view"][0] : raw["view"];
  return value === "list" ? "list" : "grid";
}

export default async function ProjectsPage({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = toProjectQuery(raw);
  const view = readView(raw);
  const results = filterProjects(demoProjects, query);
  const filtersActive = isQueryActive(query);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catálogo"
        title={ui.projects.title}
        description={ui.projects.description}
        meta={
          <>
            <span>
              Fonte: <code className="font-mono text-2xs">src/demo/projects.ts</code>
            </span>
            <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden="true" />
            <span>Ordenação ativa: {ui.projects.sort[query.sort]}</span>
          </>
        }
      />

      <DemoNotice />

      <ProjectToolbar projects={demoProjects} query={query} view={view} activeCount={results.length} />

      {results.length === 0 ? (
        <EmptyState
          title={filtersActive ? ui.projects.empty.withFilters : ui.projects.empty.noData}
          description={
            filtersActive
              ? "Alarga a pesquisa ou remove o filtro de estado para voltar a ver os seis empreendimentos de demonstração."
              : ui.projects.empty.noDataHint
          }
          action={
            filtersActive ? (
              <Link href="/app/projetos" className={buttonClass("secondary", "md")}>
                {ui.actions.clearFilters}
              </Link>
            ) : (
              <Link href="/app" className={buttonClass("secondary", "md")}>
                Voltar à visão geral
              </Link>
            )
          }
          illustration={<EmptyPlanIllustration />}
        />
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <ol className="surface-card divide-y divide-line overflow-hidden">
          {results.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </ol>
      )}
    </div>
  );
}
