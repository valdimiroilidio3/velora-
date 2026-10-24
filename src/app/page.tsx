import Link from "next/link";
import { ArrowUpRight, Check, CircleDashed, Compass } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-chrome";
import { PlanDrawing } from "@/components/projects/plan-drawing";
import { buttonClass } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { buildMassing } from "@/demo/massing";
import { demoProjects } from "@/demo/projects";
import { ui } from "@/i18n/pt";

const SECTIONS = [
  {
    n: "01",
    title: "Catálogo de projetos",
    body: "Grelha e lista com pesquisa, filtro por estado e ordenação a funcionar sobre dados locais. O URL guarda o estado, por isso partilhar ou recarregar mantém a vista.",
    href: "/app/projetos",
    cta: "Abrir catálogo",
  },
  {
    n: "02",
    title: "Cena volumétrica em WebGL",
    body: "Volumes, alturas de piso e recuos derivados dos dados de demonstração, com câmara limitada e alternativa vetorial quando não existe GPU. Não é um modelo BIM.",
    href: "/app/cena",
    cta: "Ver a cena",
  },
  {
    n: "03",
    title: "Design system próprio",
    body: "Tokens de cor, tipografia, espaçamento, raio, sombra e movimento num único ficheiro. Os componentes consomem-nos; não há valores soltos em JSX.",
    href: "/app/projetos",
    cta: "Ver componentes em uso",
  },
  {
    n: "04",
    title: "Preferências visuais",
    body: "Tema, densidade, movimento e qualidade de cena, guardadas no navegador e aplicadas antes da primeira pintura. Sem servidor, sem sincronização entre dispositivos.",
    href: "/app/preferencias",
    cta: "Abrir preferências",
  },
] as const;

const LEDGER = [
  {
    label: "Real e verificado",
    icon: Check,
    tone: "text-success",
    items: [
      "Next.js App Router em TypeScript estrito, com lint, typecheck, testes unitários e build reproduzíveis",
      "Sistema de tokens e componentes base (botão, campo, estado vazio, alerta, skeleton, toast, pílulas de estado)",
      "Pesquisa, filtro e ordenação do catálogo implementados e testados como funções puras",
      "Cena WebGL com libertação explícita de GPU, alternativa SVG e limites de câmara",
      "Contraste AA verificado por teste nos pares de tokens; `prefers-reduced-motion` respeitado",
    ],
  },
  {
    label: "Demonstração",
    icon: CircleDashed,
    tone: "text-info",
    items: [
      "Seis empreendimentos fictícios (códigos DEMO-01 a DEMO-06), localizações e preços inventados",
      "Sessão de utilizador fingida para desenhar cabeçalho e perfis — não há autenticação",
      "Métricas de disponibilidade e tipologias calculadas a partir de constantes locais",
      "Volumetria gerada por uma projeção determinística, não por importação de plantas",
    ],
  },
  {
    label: "Ainda não existe",
    icon: Compass,
    tone: "text-ink-muted",
    items: [
      "Autenticação, organizações, papéis e isolamento por tenant (Fase 1)",
      "Bases de dados, ORM, migrações e persistência de projetos",
      "Motor BIM, edição geométrica e carregamento de plantas (Fases 2–3)",
      "Geração por IA, visitas guiadas, leads, planos comerciais e pagamentos",
      "Publicação de páginas comerciais e i18n completo",
    ],
  },
] as const;

const STACK = [
  ["Next.js 16.4.3 (App Router)", "framework e rotas"],
  ["React 19.3.1", "renderização"],
  ["TypeScript 5.9.3 (strict)", "tipagem estrita em todo o código"],
  ["Tailwind CSS 4.3.3", "utilitários sobre tokens próprios"],
  ["three.js 0.186.1", "cena WebGL, carregada por rota"],
  ["lucide-react 1.61.0", "ícones consistentes"],
  ["Vitest 5.0.5 + axe-core", "testes de lógica e acessibilidade em jsdom"],
  ["pnpm 12.15.0", "lockfile reproduzível"],
] as const;

export default function LandingPage() {
  const hero = demoProjects.find((project) => project.slug === "mares-do-casal") ?? demoProjects[0];
  const podiumPlate = demoProjects.find((project) => project.slug === "patio-da-alameda") ?? demoProjects[1];

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="conteudo" className="flex-1">
        {/* ── Abertura ─────────────────────────────────────────────────────── */}
        <section className="border-b border-line">
          <div className="mx-auto grid w-full max-w-shell gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_minmax(0,0.98fr)] lg:gap-16 lg:py-20">
            <div className="grid content-start gap-6">
              <p className="flex flex-wrap items-center gap-3 text-2xs uppercase tracking-[0.18em] text-ink-muted">
                <span className="h-px w-8 bg-line-strong" aria-hidden="true" />
                Fase 2 · aplicação-base, design system e cena
                <DemoBadge />
              </p>

              <h1 className="max-w-[26ch] font-display text-5xl leading-[1.03] sm:text-6xl">
                O empreendimento antes de existir.
              </h1>

              <p className="prose-block">
                A VELORA organiza o projeto, apresenta o volume e prepara a comercialização de
                empreendimentos. Esta versão entrega a base estruturada do produto — rotas, componentes,
                catálogo de demonstração e uma cena 3D limitada por princípio — para evoluir sem reescrever o
                que já está certo.
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link href="/app/projetos" className={buttonClass("primary", "lg")}>
                  {ui.actions.tryDemo}
                </Link>
                <Link href="/acesso" className={buttonClass("secondary", "lg")}>
                  {ui.actions.signIn}
                </Link>
              </div>

              <p className="max-w-[46ch] text-xs text-ink-muted">
                Nada aqui simula um serviço de produção: não há registo, palavras-passe, base de dados nem
                faturação. O ecrã de acesso valida o formulário e explica exatamente onde a autenticação vai
                entrar.
              </p>
            </div>

            {/* Chapa de desenho: a identidade visual vem do próprio sistema de representação. */}
            <figure className="self-center">
              <div className="blueprint-grid rounded-lg border border-line bg-canvas-sunken p-3 shadow-e2">
                <div className="rounded-md border border-line bg-surface p-2">
                  {hero ? (
                    <PlanDrawing
                      massing={buildMassing(hero.scene)}
                      role="figure"
                      label={`Planta esquemática do projeto de demonstração ${hero.name}`}
                      className="aspect-square w-full"
                    />
                  ) : null}
                </div>
              </div>
              <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-2xs text-ink-muted">
                <span>
                  Chapa 01 · {hero ? `${hero.code} · ${hero.city}` : "sem projeto"} · desenho gerado a partir
                  dos dados
                </span>
                <span className="tabular">escala indicativa</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── O que já abre ────────────────────────────────────────────────── */}
        <section id="produto" aria-labelledby="produto-heading" className="border-b border-line">
          <div className="mx-auto grid w-full max-w-shell gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div className="grid content-start gap-4">
              <p className="text-2xs uppercase tracking-[0.18em] text-ink-muted">Superfícies ativas</p>
              <h2
                id="produto-heading"
                className="max-w-[20ch] font-display text-3xl leading-tight sm:text-4xl"
              >
                Quatro páginas que já respondem a interação real.
              </h2>
              <p className="prose-block text-sm">
                Não há links decorativos: cada entrada abaixo tem rota, estado vazio, estado de carregamento e
                alternativa para teclado. O que ainda não existe está marcado como indisponível, com a fase de
                destino.
              </p>
            </div>

            <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
              {SECTIONS.map((section) => (
                <li key={section.n} className="bg-surface">
                  <Link
                    href={section.href}
                    className="group grid gap-2 px-4 py-4 transition-colors duration-150 ease-quart-out hover:bg-canvas-sunken/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline sm:gap-5 sm:px-5"
                  >
                    <span className="tabular font-display text-lg text-ink-muted sm:text-sm">
                      {section.n}
                    </span>
                    <span className="grid gap-1">
                      <span className="flex items-center gap-2 text-base font-medium">{section.title}</span>
                      <span className="max-w-[60ch] text-sm text-ink-muted">{section.body}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-secondary transition-colors duration-150 group-hover:text-accent">
                      {section.cta}
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Livro-razão do estado ────────────────────────────────────────── */}
        <section
          id="estado"
          aria-labelledby="estado-heading"
          className="border-b border-line bg-canvas-sunken/40"
        >
          <div className="mx-auto grid w-full max-w-shell gap-8 px-5 py-14 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2
                id="estado-heading"
                className="max-w-[28ch] font-display text-3xl leading-tight sm:text-4xl"
              >
                O que é real, o que é demonstração e o que falta.
              </h2>
              <p className="max-w-[44ch] text-sm text-ink-muted">
                Separado de propósito: um relatório que mistura as três categorias não serve para decidir
                nada.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
              {LEDGER.map((column) => (
                <div key={column.label} className="grid content-start gap-3 bg-surface px-4 py-5 sm:px-5">
                  <p
                    className={`flex items-center gap-2 text-2xs uppercase tracking-[0.16em] ${column.tone}`}
                  >
                    <column.icon aria-hidden="true" className="size-3.5" />
                    {column.label}
                  </p>
                  <ul className="grid gap-2.5 text-sm text-ink-secondary">
                    {column.items.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[0.55em] h-px w-3 shrink-0 bg-line-strong" />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Decisões e base técnica ─────────────────────────────────────── */}
        <section aria-labelledby="base-heading" className="border-b border-line">
          <div className="mx-auto grid w-full max-w-shell gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div className="grid content-start gap-4">
              <h2 id="base-heading" className="font-display text-3xl leading-tight">
                Base técnica instalada.
              </h2>
              <p className="prose-block text-sm">
                Versões fixadas no lockfile e verificadas no registo público antes da instalação; intervalos
                de pares e licenças registados em{" "}
                <code className="font-mono text-2xs">docs/DEPENDENCIES.md</code>. As decisões de arquitetura
                estão em ADRs numerados — inclusive as que limitam esta fase.
              </p>
              <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line text-sm">
                {STACK.map(([name, role]) => (
                  <div
                    key={name}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 bg-surface px-4 py-2.5"
                  >
                    <dt className="font-medium text-ink">{name}</dt>
                    <dd className="text-ink-muted">{role}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid content-start gap-4">
              <p className="text-2xs uppercase tracking-[0.18em] text-ink-muted">Identidade</p>
              <div className="blueprint-grid rounded-lg border border-line bg-canvas-sunken p-3">
                <div className="rounded-md border border-line bg-surface p-2">
                  {podiumPlate ? (
                    <PlanDrawing
                      massing={buildMassing(podiumPlate.scene)}
                      levelIndex={0}
                      role="figure"
                      label={`Planta do piso de pódio do projeto de demonstração ${podiumPlate.name}`}
                      className="aspect-square w-full"
                    />
                  ) : null}
                </div>
              </div>
              <p className="prose-block text-xs text-ink-muted">
                A ilustração não é um asset: é o desenho do próprio conjunto de dados. Muda de cor com os
                tokens, responde a `prefers-reduced-motion` porque não anima, e serve de alternativa quando o
                WebGL não está disponível. Chapa 02 · pódio.
              </p>
              <Link
                href="/app"
                className={buttonClass("secondary", "md", { className: "justify-self-start" })}
              >
                Entrar na aplicação de demonstração
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="acesso-heading" className="bg-surface-inverse text-ink-on-inverse">
          <div className="mx-auto grid w-full max-w-shell items-center gap-6 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              <p className="text-2xs uppercase tracking-[0.18em] text-ink-on-inverse/60">Acesso</p>
              <h2 id="acesso-heading" className="font-display text-2xl leading-snug sm:text-3xl">
                Entra sem conta. Sai com a certeza do que é fingido.
              </h2>
              <p className="max-w-[58ch] text-sm text-ink-on-inverse/75">
                A página de acesso valida os campos e mostra onde a autenticação real será ligada. Não cria
                sessão, não guarda credenciais e não finge estar protegida.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/acesso"
                className={buttonClass("primary", "lg", { className: "border border-ink-on-inverse/25" })}
              >
                {ui.actions.signIn}
              </Link>
              <Link
                href="/app"
                className={buttonClass("ghost", "lg", {
                  className: "text-ink-on-inverse/80 hover:text-ink-on-inverse",
                })}
              >
                Ir direto para /app
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
