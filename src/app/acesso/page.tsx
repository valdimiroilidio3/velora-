import type { Metadata } from "next";
import Link from "next/link";
import { AccessForm } from "./access-form";
import { PublicFooter, PublicHeader } from "@/components/layout/public-chrome";
import { DemoNotice } from "@/components/ui/demo-badge";
import { ui } from "@/i18n/pt";

export const metadata: Metadata = {
  title: "Acesso",
  description:
    "Entrada de demonstração: valida os campos do formulário e explica onde a autenticação real vai ser ligada. Não cria sessão nem guarda credenciais.",
};

const NEXT_STEPS = [
  ["Sessão e identidade", "OpenID Connect ou sessão própria com cookies `httpOnly` assinados — Fase 1."],
  [
    "Papéis e organização",
    "Proprietário, gestor comercial, visitante: autorização por recurso, não por página.",
  ],
  ["Proteção contra abuso", "Limitação de tentativas, bloqueio progressivo e auditabilidade de acessos."],
  [
    "Ambientes",
    "Segregação de demonstração/produção para que nenhuma conta de teste entre num catálogo real.",
  ],
] as const;

export default function AccessPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="conteudo" className="flex-1">
        <div className="mx-auto grid w-full max-w-shell gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-16">
          <div className="grid content-start gap-6">
            <div className="grid gap-3">
              <p className="flex flex-wrap items-center gap-3 text-2xs uppercase tracking-[0.18em] text-ink-muted">
                <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
                {ui.brand.name} · entrada de demonstração
              </p>
              <h1 className="max-w-[22ch] font-display text-4xl leading-[1.08] sm:text-5xl">
                Isto não é um login.
              </h1>
              <p className="prose-block text-sm">
                Não existe autenticação nesta versão. O formulário abaixo valida o formato dos campos e pára:
                nenhum valor é enviado, guardado ou trocado por sessão. Abrir a aplicação é possível
                exatamente pelo mesmo motivo — não há nada para proteger ainda.
              </p>
            </div>

            <DemoNotice />

            <div className="surface-card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">
                O que falta antes disto ser um acesso
              </h2>
              <dl className="grid gap-px bg-line">
                {NEXT_STEPS.map(([term, definition]) => (
                  <div key={term} className="grid gap-1 bg-surface px-4 py-3">
                    <dt className="text-sm font-medium text-ink">{term}</dt>
                    <dd className="text-xs text-ink-muted">{definition}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="text-xs text-ink-muted">
              Vais usar esta aplicação em trabalho real?{" "}
              <Link
                href="/app/projetos"
                className="rounded-sm text-ink underline decoration-line-strong underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Abre diretamente o catálogo de demonstração
              </Link>{" "}
              — sem este passo.
            </p>
          </div>

          <div className="grid content-start gap-4">
            <h2 className="font-display text-2xl leading-snug">Validação de cliente</h2>
            <p className="max-w-[50ch] text-sm text-ink-muted">
              As regras são as que a Fase 1 vai reaproveitar: forma de e-mail, comprimento mínimo e erros por
              campo anunciados a leitores de ecrã. Testadas isoladamente em{" "}
              <code className="font-mono text-2xs">src/lib/access-validation.ts</code>.
            </p>
            <AccessForm />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
