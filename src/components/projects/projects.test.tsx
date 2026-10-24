import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectCard } from "./project-card";
import { ProjectRow } from "./project-row";
import { ProjectToolbar } from "./project-toolbar";
import type { ReactNode } from "react";
import { demoProjects } from "@/demo/projects";
import { emptyQuery, toProjectQuery } from "@/demo/query";

/**
 * O catálogo é onde a promessa «pesquisa e filtros funcionam» é testável sem browser:
 * o URL é a fonte de verdade, o formulário é `GET` nativo e o encurtamento de intervalo
 * (debounce) existe para que uma tecla não seja um pedido.
 */

// `vi.mock` é içado acima dos imports: o estado partilhado com as fábricas de mock tem de
// nascer com `vi.hoisted`, senão acesa é lido antes de existir (TDZ).
const { router, search } = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  },
  search: { value: "" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/projetos",
  useSearchParams: () => new URLSearchParams(search.value),
  useRouter: () => router,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { readonly href: string; readonly children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  search.value = "";
  router.replace.mockClear();
  router.push.mockClear();
});

afterEach(() => {
  cleanup();
});

function firstProject() {
  const project = demoProjects[0];
  if (project === undefined) {
    throw new Error("sem dados de demonstração para o teste");
  }
  return project;
}

describe("ProjectCard", () => {
  it("tem um único link com nome acessível e aponta para a ficha", () => {
    const project = firstProject();
    render(<ProjectCard project={project} />);
    const link = screen.getByRole("link", { name: project.name });
    expect(link).toHaveAttribute("href", `/app/projetos/${project.slug}`);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("declara estado, atualização e disponibilidade em texto (não só em barra)", () => {
    const project = firstProject();
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Publicado")).toBeInTheDocument();
    expect(screen.getByText(/de \d+ frações disponíveis/)).toBeInTheDocument();
    expect(screen.getByText(/Atualizado:/)).toBeInTheDocument();
  });

  it("trata a planta do cartão como decoração, não como conteúdo duplicado", () => {
    // No cartão o desenho não acrescenta informação: o que conta está em texto. A variante
    // com `role="img"` e descrição é a da alternativa de cena (ver scene-fallback.test.tsx).
    const { container } = render(<ProjectCard project={firstProject()} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg[role='img']")).toBeNull();
    expect(container.querySelector('[style*="width"]')).not.toBeNull(); // barra de disponibilidade pintada
  });
});

describe("ProjectRow", () => {
  it("é uma linha de lista com o mesmo destino do cartão", () => {
    const project = firstProject();
    const { container } = render(
      <ol>
        <ProjectRow project={project} />
      </ol>,
    );
    expect(container.querySelector("li")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: project.name })).toHaveAttribute(
      "href",
      `/app/projetos/${project.slug}`,
    );
    expect(screen.getByText(`${project.city}, ${project.region}`)).toBeInTheDocument();
  });
});

describe("ProjectToolbar", () => {
  it("é um formulário GET com os controlos rotulados", () => {
    render(
      <ProjectToolbar
        projects={demoProjects}
        query={emptyQuery}
        view="grid"
        activeCount={demoProjects.length}
      />,
    );
    const form = screen.getByRole("searchbox", { name: /pesquisar por nome/i }).closest("form");
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/app/projetos");
    expect(screen.getByRole("combobox", { name: /filtrar por estado/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /ordenar por/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aplicar/i })).toBeInTheDocument();
  });

  it("conta os resultados por estado dentro das próprias opções", () => {
    render(
      <ProjectToolbar
        projects={demoProjects}
        query={emptyQuery}
        view="grid"
        activeCount={demoProjects.length}
      />,
    );
    const statusSelect = screen.getByRole("combobox", { name: /filtrar por estado/i });
    const counts = demoProjects.length;
    expect(screen.getByDisplayValue(`Todos os estados (${counts})`)).toBeInTheDocument();
    expect(statusSelect).toHaveValue("all");
  });

  it("o seletor de estado escreve no URL em vez de submeter o formulário", () => {
    render(
      <ProjectToolbar
        projects={demoProjects}
        query={emptyQuery}
        view="grid"
        activeCount={demoProjects.length}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: /filtrar por estado/i }), {
      target: { value: "published" },
    });
    expect(router.replace).toHaveBeenCalledWith("/app/projetos?status=published", { scroll: false });
  });

  it("alternar a vista preserva a pesquisa e o filtro", () => {
    const query = toProjectQuery({ q: "porto", status: "published" });
    render(<ProjectToolbar projects={demoProjects} query={query} view="grid" activeCount={1} />);
    const listLink = screen.getByRole("link", { name: /lista/i });
    expect(listLink).toHaveAttribute("href", "/app/projetos?q=porto&status=published&view=list");
    expect(screen.getByRole("link", { name: /grelha/i })).toHaveAttribute("aria-current", "true");
  });

  it("limpar filtros dispara o evento que esvazia o campo e navega", () => {
    search.value = "q=porto";
    render(
      <ProjectToolbar
        projects={demoProjects}
        query={toProjectQuery({ q: "porto" })}
        view="list"
        activeCount={1}
      />,
    );
    const listener = vi.fn();
    document.addEventListener("velora:search-clear", listener);
    fireEvent.click(screen.getByRole("button", { name: /limpar filtros/i }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/app/projetos?view=list");
    document.removeEventListener("velora:search-clear", listener);
  });
});

describe("pesquisa com debounce", () => {
  it("cada tecla não provoca um render por vez", async () => {
    render(<ProjectToolbar projects={demoProjects} query={emptyQuery} view="grid" activeCount={6} />);
    const input = screen.getByRole("searchbox", { name: /pesquisar por nome/i });
    fireEvent.input(input, { target: { value: "ma" } });
    fireEvent.input(input, { target: { value: "mar" } });
    fireEvent.input(input, { target: { value: "mare" } });
    expect(router.replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledTimes(1);
    });
    // Só o último estado interessa: o URL fica com o texto completo.
    expect(router.replace).toHaveBeenLastCalledWith("/app/projetos?q=mare", { scroll: false });
    expect(input).toHaveValue("mare");
  });

  it("Esc limpa o campo e escreve o URL de imediato", () => {
    search.value = "q=porto";
    render(
      <ProjectToolbar
        projects={demoProjects}
        query={toProjectQuery({ q: "porto" })}
        view="grid"
        activeCount={1}
      />,
    );
    const input = screen.getByRole("searchbox", { name: /pesquisar por nome/i });
    expect(input).toHaveValue("porto");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    expect(router.replace).toHaveBeenCalledWith("/app/projetos", { scroll: false });
  });

  it("mantém o valor no DOM quando o URL é alterado por navegação de histórico", async () => {
    render(<ProjectToolbar projects={demoProjects} query={emptyQuery} view="grid" activeCount={6} />);
    const input = screen.getByRole("searchbox", { name: /pesquisar por nome/i });
    fireEvent.input(input, { target: { value: "colinas" } });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    // O campo lê `location.search` (não o estado do React): o teste simula o histórico real.
    window.history.replaceState({}, "", "/app/projetos?q=outra");
    search.value = "q=outra";
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    await waitFor(() => expect(input).toHaveValue("outra"));
  });
});
