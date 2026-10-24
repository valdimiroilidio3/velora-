import type { DemoProject, DemoTypology, ProjectStatus } from "./projects";

export type StatusFilter = ProjectStatus | "all";
export type SortKey = "updated" | "name" | "availability" | "price";

export interface ProjectQuery {
  readonly q: string;
  readonly status: StatusFilter;
  readonly sort: SortKey;
}

export const emptyQuery: ProjectQuery = { q: "", status: "all", sort: "updated" };

/** Normalização para pesquisa: minúsculas, sem acentos, espaços colapsados. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTokens(query: string): string[] {
  const normalized = normalize(query);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

export function matchesQuery(project: DemoProject, query: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) {
    return true;
  }
  const haystack = normalize(
    [
      project.name,
      project.subtitle,
      project.code,
      project.slug,
      project.city,
      project.region,
      project.developer,
      project.completionQuarter,
      project.typologies.map((typology: DemoTypology) => typology.code).join(" "),
    ].join(" "),
  );
  // Todas as palavras contam (AND): "t3 porto" não devolve T2 de Braga.
  return tokens.every((token) => haystack.includes(token));
}

export function filterProjects(
  projects: readonly DemoProject[],
  query: Partial<ProjectQuery> = {},
): DemoProject[] {
  const status = query.status ?? emptyQuery.status;
  const sort = query.sort ?? emptyQuery.sort;
  const q = query.q ?? emptyQuery.q;

  const matched = projects.filter(
    (project) => (status === "all" || project.status === status) && matchesQuery(project, q),
  );

  const sorted = [...matched];
  switch (sort) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" }));
      break;
    case "availability":
      sorted.sort((a, b) => availableUnits(b) - availableUnits(a) || a.name.localeCompare(b.name, "pt-PT"));
      break;
    case "price":
      // Sem preço definido vai para o fim, em qualquer tema ou ordenação.
      sorted.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "updated":
    default:
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
          a.name.localeCompare(b.name, "pt-PT"),
      );
      break;
  }
  return sorted;
}

function availableUnits(project: DemoProject): number {
  return project.typologies.reduce((total, typology) => total + typology.available, 0);
}

function totalUnits(project: DemoProject): number {
  return project.typologies.reduce((total, typology) => total + typology.units, 0);
}

/** `Infinity` como sentinela de "sem preço": ordena sempre para o fim. */
function priceOf(project: DemoProject): number {
  return project.priceFromEur ?? Number.POSITIVE_INFINITY;
}

export function statusCounts(projects: readonly DemoProject[]): Record<ProjectStatus | "all", number> {
  const counts: Record<ProjectStatus | "all", number> = {
    all: projects.length,
    draft: 0,
    in_review: 0,
    published: 0,
    archived: 0,
  };
  for (const project of projects) {
    counts[project.status] += 1;
  }
  return counts;
}

export function isQueryActive(query: Partial<ProjectQuery>): boolean {
  return (
    (query.q ?? "").trim().length > 0 ||
    (query.status !== undefined && query.status !== "all") ||
    (query.sort !== undefined && query.sort !== emptyQuery.sort)
  );
}

export function availabilityRatio(project: DemoProject): number {
  const total = totalUnits(project);
  return total === 0 ? 0 : availableUnits(project) / total;
}

export type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

const statusValues = new Set<StatusFilter>(["all", "draft", "in_review", "published", "archived"]);
const sortValues = new Set<SortKey>(["updated", "name", "availability", "price"]);

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * URL → estado. Nada é confiado: parâmetros repetidos, vazios ou inventados caem no valor
 * por omissão. É o que permite que a mesma função sirva o `form method="get"` e os controlos
 * de cliente sem duplicar validação.
 */
export function toProjectQuery(raw: RawSearchParams): ProjectQuery {
  const q = first(raw["q"])?.slice(0, 120) ?? "";
  const status = first(raw["status"]);
  const sort = first(raw["sort"]);
  return {
    q,
    status:
      status !== undefined && statusValues.has(status as StatusFilter) ? (status as StatusFilter) : "all",
    sort: sort !== undefined && sortValues.has(sort as SortKey) ? (sort as SortKey) : "updated",
  };
}

export interface WorkspaceSummary {
  readonly total: number;
  readonly published: number;
  readonly inReview: number;
  readonly draft: number;
  readonly archived: number;
  readonly availableUnits: number;
  readonly totalUnits: number;
  readonly lastUpdated: string | null;
}

export function summarizeProjects(projects: readonly DemoProject[]): WorkspaceSummary {
  const summary = {
    total: projects.length,
    published: 0,
    inReview: 0,
    draft: 0,
    archived: 0,
    availableUnits: 0,
    totalUnits: 0,
    lastUpdated: null as string | null,
  };

  for (const project of projects) {
    if (project.status === "published") {
      summary.published += 1;
    } else if (project.status === "in_review") {
      summary.inReview += 1;
    } else if (project.status === "draft") {
      summary.draft += 1;
    } else {
      summary.archived += 1;
    }
    summary.availableUnits += availableUnits(project);
    summary.totalUnits += totalUnits(project);
    if (summary.lastUpdated === null || project.updatedAt > summary.lastUpdated) {
      summary.lastUpdated = project.updatedAt;
    }
  }

  return summary;
}
