import { cn } from "@/lib/cn";
import { ui } from "@/i18n/pt";
import type { ReactNode } from "react";

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly error?: string;
  readonly optional?: boolean;
  readonly className?: string;
  readonly children: (attributes: FieldAttributes) => ReactNode;
}

export interface FieldAttributes {
  readonly id: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
  readonly "data-invalid"?: boolean;
}

/**
 * Rótulo + ajuda + erro com a ligação ARIA feita uma única vez. O controlo recebe os
 * atributos prontos — é isto que evita campos acessíveis "por acaso" em cada formulário novo.
 */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps): ReactNode {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter((value): value is string => value !== undefined).join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
        <span>
          {label}
          {optional ? null : (
            <>
              <span aria-hidden="true" className="ml-1 text-accent">
                *
              </span>
              <span className="sr-only"> {ui.forms.required}</span>
            </>
          )}
        </span>
        {optional ? <span className="text-2xs text-ink-muted">{ui.forms.optional}</span> : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "data-invalid": error ? true : undefined,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-xs text-danger">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Estilo partilhado por input/select/textarea — uma só definição de controlo de formulário. */
export const controlClass =
  "w-full rounded-md border border-line-control bg-surface px-3 text-sm text-ink " +
  "transition-[border-color,box-shadow,background-color] duration-150 ease-quart-out placeholder:text-ink-muted " +
  "hover:border-ink-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus " +
  "min-h-[var(--tap-min)] data-[invalid=true]:border-danger data-[invalid=true]:bg-danger-soft";
