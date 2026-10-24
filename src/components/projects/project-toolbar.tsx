import { LayoutGrid, List, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClearFiltersButton } from "./clear-filters-button";
import { LiveSearchField } from "./live-search-field";
import { LiveSelectField } from "./live-select-field";
import { statusOrder } from "@/components/ui/status-pill";
import { ui } from "@/i18n/pt";
import { statusCounts, type ProjectQuery } from "@/demo/query";
import type { DemoProject } from "@/demo/projects";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface ProjectToolbarProps {
  readonly projects: readonly DemoProject[];
  readonly query: ProjectQuery;
  readonly view: "grid" | "list";
  readonly activeCount: number;
}

function projectsHref(
  query: ProjectQuery,
  patch: Partial<ProjectQuery>,
  viewOverride?: "grid" | "list",
): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.q.length > 0) {
    params.set("q", merged.q);
  }
  if (merged.status !== "all") {
    params.set("status", merged.status);
  }
  if (merged.sort !== "updated") {
    params.set("sort", merged.sort);
  }
  const view = viewOverride ?? "grid";
  if (view === "list") {
    params.set("view", "list");
  }
  const search = params.toString();
  return search.length > 0 ? `/app/projetos?${search}` : "/app/projetos";
}

/**
 * Barra de ferramentas dos projetos.
 *
 * Uma só fonte de verdade: os parâmetros do URL. O formulário é `GET` nativo (funciona
 * sem JavaScript), e os controlos `<select>` aplicam de imediato quando há hidratação.
 * Não há dois nomes iguais no mesmo formulário, por isso não há resultados ambíguos.
 */
export function ProjectToolbar({ projects, query, view, activeCount }: ProjectToolbarProps): ReactNode {
  const counts = statusCounts(projects);
  const hasActiveFilters = query.q.length > 0 || query.status !== "all" || query.sort !== "updated";

  return (
    <section aria-labelledby="project-filter-heading" className="surface-card grid gap-3 p-3 sm:p-4">
      <h2 id="project-filter-heading" className="sr-only">
        Pesquisa e filtros
      </h2>

      <form method="get" action="/app/projetos" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <LiveSearchField label={ui.projects.searchLabel} placeholder={ui.projects.searchPlaceholder} />
        </div>

        <div className="w-full sm:w-48">
          <LiveSelectField
            id="filter-status"
            name="status"
            label={ui.projects.filterLabel}
            defaultValue={query.status}
            options={[
              { value: "all", label: `${ui.projects.allStatuses} (${counts.all})` },
              ...statusOrder.map((status) => ({
                value: status,
                label: `${ui.status[status]} (${counts[status]})`,
              })),
            ]}
          />
        </div>

        <div className="w-full sm:w-48">
          <LiveSelectField
            id="filter-sort"
            name="sort"
            label={ui.projects.sortLabel}
            defaultValue={query.sort}
            options={(["updated", "name", "availability", "price"] as const).map((key) => ({
              value: key,
              label: ui.projects.sort[key],
            }))}
          />
        </div>

        <Button type="submit" variant="secondary" size="md" leadingIcon={<Search />}>
          {ui.actions.apply}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p aria-live="polite" className="tabular text-xs text-ink-muted">
          {ui.projects.resultsCount(activeCount)}
          {hasActiveFilters ? (
            <>
              {" · "}
              <ClearFiltersButton href="/app/projetos" keepView={view} />
            </>
          ) : null}
        </p>

        <div
          role="group"
          aria-label="Modo de visualização"
          className="flex items-center gap-1 rounded-md border border-line bg-canvas-sunken/60 p-0.5"
        >
          {(
            [
              { key: "grid", label: "Grelha", Icon: LayoutGrid },
              { key: "list", label: "Lista", Icon: List },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = view === key;
            return (
              <Link
                key={key}
                href={projectsHref(query, {}, key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-xs transition-colors duration-150 ease-quart-out",
                  active
                    ? "bg-surface font-medium text-ink shadow-e1"
                    : "text-ink-muted hover:bg-surface/70 hover:text-ink",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
