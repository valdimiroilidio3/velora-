import type { ReactNode } from "react";

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly meta?: ReactNode;
  readonly level?: 1 | 2;
}

/**
 * Cabeçalho de página com hierarquia fixa: eyebrow (contexto), `h1` (assunto),
 * descrição (o que aqui se faz) e ações. Manter uma só definição evita que cada
 * página invente o seu próprio ritmo vertical.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  level = 1,
}: PageHeaderProps): ReactNode {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="grid gap-3 border-b border-line pb-6 sm:gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          {eyebrow ? <p className="label-caps text-accent-ink">{eyebrow}</p> : null}
          <Heading className="text-3xl sm:text-4xl">{title}</Heading>
          {description ? <p className="max-w-[62ch] text-sm text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">{meta}</div>
      ) : null}
    </header>
  );
}
