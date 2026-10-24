import type { ReactNode } from "react";

export interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  /** Ilustração opcional: desenho de linhas (planta/alçado), nunca emoji ou ícone isolado. */
  readonly illustration?: ReactNode;
}

export function EmptyState({ title, description, action, illustration }: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-start gap-5 rounded-lg border border-dashed border-line-strong bg-canvas-sunken/40 px-5 py-8 sm:px-8 sm:py-10">
      {illustration ? (
        <div aria-hidden="true" className="hidden text-ink-muted sm:block">
          {illustration}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <p className="max-w-[46ch] text-sm text-ink-muted">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/** Malha vazia com um volume tracejado: motivo visual das áreas ainda por preencher. */
export function EmptyPlanIllustration({ size = 132 }: { readonly size?: number }): ReactNode {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 132 82" fill="none" role="presentation">
      <rect x="0.5" y="0.5" width="131" height="81" rx="3" stroke="currentColor" strokeOpacity="0.3" />
      <path
        d="M0 21h132M0 41h132M0 61h132M22 0v82M44 0v82M66 0v82M88 0v82M110 0v82"
        stroke="currentColor"
        strokeOpacity="0.08"
      />
      <rect
        x="26"
        y="20"
        width="56"
        height="42"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeDasharray="4 3"
      />
      <path d="M82 20l24 21-24 21" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 3" />
    </svg>
  );
}
