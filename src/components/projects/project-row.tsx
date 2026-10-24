import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectStatusPill } from "@/components/ui/status-pill";
import { projectUnitTotals, type DemoProject } from "@/demo/projects";
import { formatAreaRange, formatDateTime, formatPrice } from "@/lib/format";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

/**
 * Linha de projeto (vista de lista).
 * Uma só árvore de marcação: em ecrã estreito os campos empilham com rótulo visível;
 * a partir de `md` tornam-se colunas alinhadas. Evita duplicar tabela + cartões e o
 * transbordo horizontal que uma `<table>` de 6 colunas causaria no telemóvel.
 */
export function ProjectRow({ project }: { readonly project: DemoProject }): ReactNode {
  const totals = projectUnitTotals(project);

  return (
    <li className="group relative grid items-center gap-x-6 gap-y-2 bg-surface px-4 py-3 transition-colors duration-150 ease-quart-out hover:bg-canvas-sunken/70 focus-within:bg-canvas-sunken/70 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_auto_minmax(0,0.9fr)_minmax(0,0.75fr)] md:py-2.5">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-2xs text-ink-muted md:hidden">{ui.projects.columns.development}</span>
        <p className="truncate text-sm font-medium text-ink">
          <Link
            href={`/app/projetos/${project.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {project.name}
          </Link>
        </p>
        <p className="truncate text-2xs text-ink-muted">
          {project.code} · {project.subtitle}
        </p>
      </div>

      <div className="grid min-w-0 gap-0.5">
        <span className="text-2xs text-ink-muted md:hidden">{ui.projects.columns.location}</span>
        <p className="truncate text-sm text-ink-secondary">
          {project.city}, {project.region}
        </p>
      </div>

      <div className="flex items-center gap-2 md:justify-self-start">
        <span className="text-2xs text-ink-muted md:hidden">{ui.projects.columns.status}</span>
        <ProjectStatusPill status={project.status} />
      </div>

      <div className="grid min-w-0 gap-0.5">
        <span className="text-2xs text-ink-muted md:hidden">{ui.projects.columns.availability}</span>
        <p className="tabular text-xs text-ink-secondary">
          {totals.available}/{totals.total} disp. · {formatAreaRange(project.areaFromM2, project.areaToM2)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:gap-1">
        <span className="grid gap-0.5 md:text-right">
          <span className="text-2xs text-ink-muted md:hidden">{ui.projects.columns.price}</span>
          <span className="tabular text-sm font-medium text-ink">{formatPrice(project.priceFromEur)}</span>
          <span className="tabular hidden text-2xs text-ink-muted md:block">
            {formatDateTime(project.updatedAt)}
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-muted transition-transform duration-150 ease-quart-out group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
    </li>
  );
}
