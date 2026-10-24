import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectStatusPill } from "@/components/ui/status-pill";
import { PlanDrawing } from "./plan-drawing";
import { buildMassing } from "@/demo/massing";
import { projectUnitTotals, type DemoProject } from "@/demo/projects";
import { formatAreaRange, formatPrice, formatRelative } from "@/lib/format";
import { ui } from "@/i18n/pt";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function AvailabilityBar({
  available,
  total,
  className,
}: {
  readonly available: number;
  readonly total: number;
  readonly className?: string;
}): ReactNode {
  const ratio = total === 0 ? 0 : Math.round((available / total) * 100);
  return (
    <span className={cn("grid gap-1", className)}>
      <span
        aria-hidden="true"
        className="h-1 w-full overflow-hidden rounded-full bg-canvas-sunken ring-1 ring-line"
      >
        <span className="block h-full rounded-full bg-accent" style={{ width: `${ratio}%` }} />
      </span>
      <span className="tabular text-2xs text-ink-muted">
        {available} de {total} frações disponíveis
      </span>
    </span>
  );
}

/** Cartão de projeto (vista de grelha). O link esticado torna todo o cartão acionável sem perder semântica. */
export function ProjectCard({ project }: { readonly project: DemoProject }): ReactNode {
  const totals = projectUnitTotals(project);
  const massing = buildMassing(project.scene);

  return (
    <article className="surface-card group relative grid overflow-hidden transition-[box-shadow,border-color,transform] duration-200 ease-quart-out hover:-translate-y-px hover:border-line-strong hover:shadow-e2 focus-within:border-accent">
      <div className="relative aspect-[16/9] border-b border-line bg-canvas-sunken">
        <PlanDrawing massing={massing} className="absolute inset-0 p-3 opacity-90" />
        <span className="absolute left-2.5 top-2.5">
          <ProjectStatusPill status={project.status} />
        </span>
      </div>

      <div className="grid content-start gap-3 p-4 py-[var(--space-card-y)]">
        <div className="grid gap-1">
          <p className="label-caps text-ink-muted">
            {project.code} · {project.city}
          </p>
          <h3 className="text-lg leading-snug">
            <Link
              href={`/app/projetos/${project.slug}`}
              className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus hover:underline hover:decoration-line-strong hover:underline-offset-4"
            >
              {project.name}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm text-ink-muted">{project.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
          <span className="grid gap-0.5">
            <span className="text-2xs text-ink-muted">{ui.projects.columns.price}</span>
            <span className="tabular font-medium text-ink">{formatPrice(project.priceFromEur)}</span>
          </span>
          <span className="grid gap-0.5">
            <span className="text-2xs text-ink-muted">Áreas</span>
            <span className="tabular font-medium text-ink">
              {formatAreaRange(project.areaFromM2, project.areaToM2)}
            </span>
          </span>
          <AvailabilityBar available={totals.available} total={totals.total} className="col-span-2 pt-1" />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span className="tabular">
            {ui.projects.columns.updated}: {formatRelative(project.updatedAt)}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-ink-secondary transition-colors duration-150 group-hover:text-accent">
            {ui.actions.openProject}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
