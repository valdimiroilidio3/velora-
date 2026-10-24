import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoNotice } from "@/components/ui/demo-badge";
import { RadioCards } from "@/components/ui/radio-cards";
import { ProjectStatusPill } from "@/components/ui/status-pill";
import { SceneFallback } from "@/components/scene/scene-fallback";
import { ProjectCard } from "@/components/projects/project-card";
import { buildMassing } from "@/demo/massing";
import { demoProjects } from "@/demo/projects";
import { FieldSample } from "@/test/form-samples";
import { ui } from "@/i18n/pt";

/**
 * Varrimento de acessibilidade com axe-core sobre as superfícies reais da Fase 2.
 *
 * Uma regra é desativada, e é a única: `color-contrast`. O jsdom não resolve as variáveis do
 * sistema de tokens nem aplica a folha de estilos, portanto o axe não tem cores para comparar;
 * o contraste é verificado mecanicamente no `design-tokens.test.ts`, em ambos os temas, com as
 * razões WCAG corretas (4.5:1 para texto, 3:1 para bordos de controlo e foco).
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { readonly href: string; readonly children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function Surfaces(): ReactNode {
  const project = demoProjects[0] ?? demoProjects[1];
  if (project === undefined) return null;
  const massing = buildMassing(project.scene);
  return (
    <main>
      <h1>{ui.projects.title}</h1>
      <DemoNotice />
      {/* Mesma hierarquia da página real: h1 da página, h2 da secção, h3 do cartão. */}
      <section aria-labelledby="catalogo">
        <h2 id="catalogo">Resultados</h2>
        <ul>
          <li>
            <ProjectCard project={project} />
          </li>
        </ul>
      </section>
      <section aria-labelledby="estados">
        <h2 id="estados">Estados</h2>
        <FieldSample />
        <RadioCards
          name="densidade"
          legend="Densidade"
          value="compact"
          options={[
            { value: "comfortable", label: "Confortável", description: "mais respiro" },
            { value: "compact", label: "Compacta", description: "mais linhas" },
          ]}
          onChange={() => undefined}
        />
        <ProjectStatusPill status="in_review" />
        <Alert tone="warning" title="Sem persistência">
          Nada é gravado nesta fase.
        </Alert>
        <EmptyState
          title="Nenhum projeto corresponde"
          description="Alarga a pesquisa."
          action={<Button>Limpar filtros</Button>}
        />
      </section>
      <section aria-labelledby="cena">
        <h2 id="cena">{ui.scene.title}</h2>
        <SceneFallback massing={massing} projectName={project.name} />
      </section>
    </main>
  );
}

describe("a11y (axe-core)", () => {
  it("não deixa violações nas superfícies da Fase 2", async () => {
    const { container } = render(<Surfaces />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
        // A folha inteira do documento não existe neste harness; as regras de landmark de
        // documento são cobertas pelo layout real (skip-link + <main id="conteudo">).
        "landmark-one-main": { enabled: false },
        region: { enabled: false },
      },
    });
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.html.slice(0, 120)),
      })),
    ).toEqual([]);
  });

  it("cada alvo interativo tem nome acessível", () => {
    render(<Surfaces />);
    const named = (element: Element): string =>
      element.getAttribute("aria-label") ?? element.textContent ?? "";
    const groups = {
      link: screen.getAllByRole("link"),
      button: screen.getAllByRole("button"),
      radio: screen.getAllByRole("radio"),
      textbox: screen.getAllByRole("textbox"),
    };
    expect(groups.link).toHaveLength(1); // um link por cartão: o nome é o título do projeto
    expect(groups.button.length).toBeGreaterThanOrEqual(1);
    expect(groups.radio).toHaveLength(2);
    expect(groups.textbox).toHaveLength(1);
    // Link e botão tiram o nome do texto interior; radio e textbox tiram-no do `<label>`
    // associado, que é o que as duas linhas seguintes verificam pelo caminho do browser.
    for (const element of [...groups.link, ...groups.button]) {
      expect(named(element).trim().length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("radio", { name: /Confortável/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /nome do empreendimento/i })).toBeInTheDocument();
    expect(named(groups.link[0] as Element)).toBe(demoProjects[0]?.name);
  });

  it("a marcação de demonstração está presente onde o catálogo aparece", () => {
    render(<Surfaces />);
    expect(screen.getByText("Dados fictícios.")).toBeInTheDocument();
    expect(screen.getAllByText(/DEMO-0/).length).toBeGreaterThan(0);
  });
});
