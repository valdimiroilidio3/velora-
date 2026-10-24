import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, CalendarClock, Layers3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CopyReferenceButton } from "@/components/projects/copy-reference-button";
import { AvailabilityBar } from "@/components/projects/project-card";
import { PlanDrawing } from "@/components/projects/plan-drawing";
import { SceneStage } from "@/components/scene/scene-stage";
import { buttonClass } from "@/components/ui/button";
import { DemoBadge, DemoNotice } from "@/components/ui/demo-badge";
import { ProjectStatusPill, statusHintFor } from "@/components/ui/status-pill";
import { buildMassing } from "@/demo/massing";
import { demoProjects, projectUnitTotals } from "@/demo/projects";
import { availabilityRatio } from "@/demo/query";
import { formatArea, formatAreaRange, formatDateTime, formatPercent, formatPrice } from "@/lib/format";
import { ui } from "@/i18n/pt";

export function generateStaticParams(): { slug: string }[] {
  return demoProjects.map((project) => ({ slug: project.slug }));
}

// Só os seis projetos de demonstração existem: qualquer outro slug vai para o 404.
export const dynamicParams = false;

function findProject(slug: string) {
  return demoProjects.find((project) => project.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly slug?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = slug === undefined ? undefined : findProject(slug);
  if (project === undefined) {
    return { title: "Projeto não encontrado" };
  }
  return {
    title: project.name,
    description: `${project.summary} Conteúdo de demonstração, sem relação com clientes reais.`,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly slug?: string }>;
}) {
  const { slug } = await params;
  const project = slug === undefined ? undefined : findProject(slug);
  if (project === undefined) {
    notFound();
  }

  const massing = buildMassing(project.scene);
  const totals = projectUnitTotals(project);
  const ratio = availabilityRatio(project);

  return (
    <div className="grid gap-6">
      <Link
        href="/app/projetos"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        {ui.projects.title}
      </Link>

      <PageHeader
        eyebrow={`${project.code} · ${project.city}, ${project.region}`}
        title={project.name}
        description={project.subtitle}
        actions={<CopyReferenceButton reference={`${project.code} · ${project.name}`} />}
        meta={
          <>
            <ProjectStatusPill status={project.status} />
            <span className="max-w-[36ch] text-2xs text-ink-muted">{statusHintFor(project.status)}</span>
            <DemoBadge />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="resumo" className="surface-card grid gap-3 p-4 sm:p-5">
            <h2 id="resumo" className="text-sm font-semibold">
              Enquadramento
            </h2>
            <p className="max-w-[62ch] text-sm text-ink-secondary">{project.summary}</p>
            <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
              {[
                ["Promotor (fictício)", project.developer],
                ["Fim de obra previsto", project.completionQuarter],
                ["Preço base", formatPrice(project.priceFromEur)],
                ["Áreas", formatAreaRange(project.areaFromM2, project.areaToM2)],
                ["Pisos modelados", `${massing.levels.length} · ${massing.totalHeightM.toFixed(1)} m`],
                ["Versões de apresentação", String(project.versions)],
              ].map(([term, value]) => (
                <div key={term} className="grid gap-0.5 bg-surface px-3 py-2.5">
                  <dt className="text-2xs text-ink-muted">{term}</dt>
                  <dd className="text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              <span className="tabular">
                {ui.projects.columns.updated}: {formatDateTime(project.updatedAt)}
              </span>
            </p>
          </section>

          <section aria-labelledby="tipologias" className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2.5">
              <h2 id="tipologias" className="text-sm font-semibold">
                Tipologias e disponibilidade
              </h2>
              <span className="tabular text-2xs text-ink-muted">
                {formatPercent(ratio)} do inventário livre
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="px-4 pt-2.5 text-left text-2xs text-ink-muted">
                  contagens e preços fictícios, definidos em{" "}
                  <code className="font-mono">src/demo/projects.ts</code>
                </caption>
                <thead className="border-b border-line text-2xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Tipologia
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Área
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Frações
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Livres
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Preço base
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {project.typologies.map((typology) => (
                    <tr
                      key={typology.code}
                      className="border-b border-line/70 last:border-b-0 hover:bg-canvas-sunken/60"
                    >
                      <th scope="row" className="px-4 py-2 text-left font-medium">
                        <span className="flex items-baseline gap-2">
                          {typology.code}
                          <span className="text-2xs font-normal text-ink-muted">
                            {typology.bedrooms} quarto{typology.bedrooms === 1 ? "" : "s"} ·{" "}
                            {typology.bathrooms} wc
                          </span>
                        </span>
                      </th>
                      <td className="tabular px-2 py-2 text-right text-ink-secondary">
                        {formatArea(typology.areaM2)}
                      </td>
                      <td className="tabular px-2 py-2 text-right text-ink-secondary">{typology.units}</td>
                      <td className="tabular px-2 py-2 text-right">
                        <span
                          className={typology.available === 0 ? "text-ink-muted" : "font-medium text-ink"}
                        >
                          {typology.available}
                        </span>
                      </td>
                      <td className="tabular px-4 py-2 text-right text-ink-secondary">
                        {formatPrice(typology.priceEur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-canvas-sunken/60 text-xs">
                    <th scope="row" className="px-4 py-2 text-left font-medium">
                      Total
                    </th>
                    <td className="px-2 py-2" />
                    <td className="tabular px-2 py-2 text-right">{totals.total}</td>
                    <td className="tabular px-2 py-2 text-right font-medium">{totals.available}</td>
                    <td className="tabular px-4 py-2 text-right">{formatPrice(project.priceFromEur)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <DemoNotice />
        </div>

        <div className="grid content-start gap-6">
          <SceneStage massing={massing} projectName={project.name} />

          <section aria-labelledby="planta" className="surface-card overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5">
              <h2 id="planta" className="text-sm font-semibold">
                {ui.actions.viewPlan}
              </h2>
              <Link
                href={`/app/cena?projeto=${project.slug}`}
                className="inline-flex items-center gap-1.5 rounded-sm text-xs text-ink-secondary underline underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Layers3 aria-hidden="true" className="size-3.5" />
                {ui.actions.view3d}
              </Link>
            </div>
            <div className="blueprint-grid p-3">
              <div className="rounded-md border border-line bg-surface p-2">
                <PlanDrawing
                  massing={massing}
                  levelIndex={0}
                  role="figure"
                  label={`Planta do piso de pódio de ${project.name}`}
                  className="aspect-[4/3] w-full"
                />
              </div>
            </div>
            <div className="grid gap-2 px-4 py-3">
              <AvailabilityBar available={totals.available} total={totals.total} />
              <Link
                href={`/app/cena?projeto=${project.slug}`}
                className={buttonClass("secondary", "sm", { className: "justify-self-start" })}
              >
                <Boxes aria-hidden="true" className="size-4" />
                Abrir na cena dedicada
              </Link>
            </div>
          </section>

          <aside className="surface-quiet grid gap-2 p-4 text-xs text-ink-muted">
            <h2 className="text-sm font-semibold text-ink">O que esta ficha ainda não tem</h2>
            <ul className="grid gap-1.5">
              <li>· Plantas por piso importadas do projeto de execução (Fase 2).</li>
              <li>· Estado de frações por unidade, contratos e preços negociados (Fase 5).</li>
              <li>· Histórico de versões com comparação (Fase 4).</li>
              <li>· Download de dossier, partilha pública com password (Fase 4+).</li>
            </ul>
            <p className="text-2xs">
              A geometria acima é uma projeção a partir de parâmetros de volume — não substitui modelo BIM nem
              caderno de encargos.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
