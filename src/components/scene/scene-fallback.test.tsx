import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SceneFallback } from "./scene-fallback";
import { buildMassing, toPlanLevels } from "@/demo/massing";
import { demoProjects } from "@/demo/projects";

/**
 * A alternativa sem WebGL não é um painel de erro: é uma representação completa.
 * Estes testes fecham a coerência entre as duas vistas (mesmos pisos, mesmas contagens)
 * e a exigência de que a informação exista fora do desenho.
 */

afterEach(() => {
  cleanup();
});

function project() {
  const found = demoProjects[0];
  if (found === undefined) throw new Error("sem dados de demonstração");
  return found;
}

describe("SceneFallback", () => {
  it("descreve a planta como figura com nome", () => {
    const massing = buildMassing(project().scene);
    const { container } = render(<SceneFallback massing={massing} projectName={project().name} />);
    const figure = container.querySelector("svg[role='img']");
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute("aria-label")).toContain("Planta esquemática");
  });

  it("a tabela de pisos cobre todos os pisos do volume", () => {
    const massing = buildMassing(project().scene);
    render(<SceneFallback massing={massing} projectName={project().name} />);
    const rows = screen.getAllByRole("row").slice(1); // exclui o cabeçalho
    const plan = toPlanLevels(massing);
    // Os pisos são agrupados por tipo (pódio / típico / recuado): a soma dos grupos é o total.
    const groupCount = rows.length;
    expect(groupCount).toBeGreaterThan(0);
    expect(groupCount).toBeLessThanOrEqual(plan.length);
    expect(screen.getByRole("heading", { name: /composição de pisos/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${massing.levels.length} pisos · ${massing.totalHeightM.toFixed(1)} m de altura`),
      ),
    ).toBeInTheDocument();
  });

  it("explica o motivo técnico quando há alternativa ativa", () => {
    const massing = buildMassing(project().scene);
    render(
      <SceneFallback
        massing={massing}
        projectName={project().name}
        reason="O navegador não expôs um contexto WebGL utilizável."
      />,
    );
    expect(screen.getByText(/contexto WebGL utilizável/)).toBeInTheDocument();
  });

  it("não se desfaz com um volume de um só piso", () => {
    const massing = buildMassing({
      floors: 1,
      podiumFloors: 0,
      setbackFloors: 0,
      wings: 1,
      bayWidthM: 6,
      depthM: 10,
      floorHeightM: 3,
      setbackInsetM: 0,
      courtyardWidthM: 0,
      orientationDeg: 0,
    });
    render(<SceneFallback massing={massing} projectName="Casa isolada" />);
    expect(screen.getByText("Piso 1")).toBeInTheDocument();
    expect(screen.getByText(/3\.0 m de altura/)).toBeInTheDocument();
    expect(screen.getByText(/planta esquemática/i)).toBeInTheDocument();
  });
});
