import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/layout/public-chrome";
import { EmptyPlanIllustration } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

const ROUTES = [
  ["/", "Página de apresentação"],
  ["/acesso", "Acesso de demonstração"],
  ["/app/projetos", "Catálogo de projetos"],
  ["/app/cena", "Cena arquitetónica"],
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="conteudo" className="flex-1">
        <div className="mx-auto grid w-full max-w-shell gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
          <div className="grid content-center gap-5">
            <p className="tabular font-display text-6xl leading-none text-ink-muted">404</p>
            <h1 className="max-w-[20ch] font-display text-3xl leading-tight sm:text-4xl">
              Não há nada desenhado para este endereço.
            </h1>
            <p className="prose-block text-sm">
              A rota não existe nesta fase. Se chegaste aqui por um link interno, isso é um defeito nosso — as
              páginas abaixo são as que têm implementação.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/" className={buttonClass("primary", "md")}>
                Voltar à apresentação
              </Link>
              <Link href="/app" className={buttonClass("secondary", "md")}>
                Abrir a aplicação de demonstração
              </Link>
            </div>
          </div>

          <div className="grid content-center gap-4">
            <div className="blueprint-grid grid place-items-center rounded-lg border border-line bg-canvas-sunken p-6">
              <EmptyPlanIllustration size={150} />
            </div>
            <nav aria-label="Rotas disponíveis" className="surface-card overflow-hidden">
              <p className="label-caps border-b border-line px-4 py-2 text-ink-muted">Rotas ativas</p>
              <ul>
                {ROUTES.map(([href, label]) => (
                  <li key={href} className="border-b border-line/70 last:border-b-0">
                    <Link
                      href={href}
                      className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-canvas-sunken/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="font-mono text-xs text-ink-secondary">{href}</span>
                      <span className="text-ink">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
