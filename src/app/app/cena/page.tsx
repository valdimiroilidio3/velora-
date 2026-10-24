import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SceneStage } from "@/components/scene/scene-stage";
import { buttonClass } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-badge";
import { buildMassing } from "@/demo/massing";
import { demoProjects, type DemoProject } from "@/demo/projects";
import { cn } from "@/lib/cn";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cena arquitetónica",
  description:
    "Volume construtivo de demonstração em WebGL, com limites de câmara, alternativa vetorial e libertação de recursos.",
};

const LAYERS = [
  { token: "--scene-podium", label: "Pódio", note: "base contínua que ocupa o alinhamento do lote" },
  { token: "--scene-mass", label: "Piso típico", note: "repetição estrutural com modulação de vãos" },
  { token: "--scene-mass-lit", label: "Recuado", note: "últimos pisos com inset perimetral" },
  {
    token: "--scene-glazing",
    label: "Faixa de caixilharia",
    note: "banda por piso, só nos corpos com 3+ vãos",
  },
  { token: "--scene-ground", label: "Terreno", note: "círculo de estudo e malha de 24 divisões" },
] as const;

const RULES = [
  "Órbita livre em azimute; inclinação limitada entre 4,6° e 75,6° para nunca passar por baixo do terreno.",
  "Zoom entre 1,7× e 8× o raio do lote: a cena não tem “modo livre” nem clipping dentro do volume.",
  "Rotação automática desligada por omissão e indisponível com movimento reduzido.",
  "Render só quando há mudança de enquadramento: sem loop permanentemente ativo, sem GPU ocupada à toa.",
  "Sem modelos externos, sem texturas, sem materiais PBR: o peso do `three` é o único custo de rede.",
] as const;

function readProject(raw: string | string[] | undefined): DemoProject | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return demoProjects[0];
  }
  return demoProjects.find((project) => project.slug === value) ?? demoProjects[0];
}

export default async function ScenePage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const raw = await searchParams;
  const selected = readProject(raw["projeto"]);

  if (selected === undefined) {
    return null;
  }

  const massing = buildMassing(selected.scene);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Área 3D"
        title={ui.scene.title}
        description="Um único volume por projeto, com luz controlada e câmara limitada. Serve para apresentar a implantação e a composição vertical — não para projetar."
        meta={
          <>
            <span className="tabular">
              {massing.levels.length} pisos · {massing.totalHeightM.toFixed(1)} m · implantação{" "}
              {massing.orientationDeg}°
            </span>
            <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden="true" />
            <span>alternativa vetorial sempre disponível</span>
          </>
        }
      />

      <nav aria-label="Escolher projeto de demonstração" className="flex flex-wrap gap-1.5">
        {demoProjects.map((project) => {
          const active = project.slug === selected.slug;
          return (
            <Link
              key={project.slug}
              href={`/app/cena?projeto=${project.slug}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ease-quart-out",
                active
                  ? "border-accent/45 bg-accent-soft text-accent-ink"
                  : "border-line-control bg-surface text-ink-muted hover:border-ink-muted hover:text-ink",
              )}
            >
              <span className="tabular mr-1.5 text-2xs text-ink-muted">{project.code}</span>
              {project.name}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SceneStage massing={massing} projectName={selected.name} />

        <div className="grid content-start gap-6">
          <section aria-labelledby="camadas" className="surface-card overflow-hidden">
            <h2 id="camadas" className="border-b border-line px-4 py-2.5 text-sm font-semibold">
              Como ler o desenho
            </h2>
            <ul className="grid gap-px bg-line">
              {LAYERS.map((layer) => (
                <li key={layer.label} className="flex items-start gap-3 bg-surface px-4 py-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-3.5 shrink-0 rounded-sm border border-line-strong"
                    style={{ backgroundColor: `var(${layer.token})` }}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium text-ink">{layer.label}</span>
                    <span className="text-xs text-ink-muted">{layer.note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-2xs text-ink-muted">
              As cores são os tokens de cena: mudar o tema em Preferências altera a renderização, sem valores
              soltos no código.
            </p>
          </section>

          <section aria-labelledby="regras" className="surface-quiet grid gap-3 p-4">
            <h2 id="regras" className="text-sm font-semibold">
              Limites auto-impostos
            </h2>
            <ul className="grid gap-2 text-xs text-ink-secondary">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55em] h-px w-3 shrink-0 bg-line-strong" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/app/projetos/${selected.slug}`}
              className={buttonClass("secondary", "sm", { className: "justify-self-start" })}
            >
              Ficha de {selected.name}
            </Link>
          </section>

          <DemoNotice />
        </div>
      </div>
    </div>
  );
}
