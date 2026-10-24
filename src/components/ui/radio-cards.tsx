import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface RadioOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
  /** Escolha não disponível neste contexto (ex.: sem WebGL). Fica desativada, não escondida. */
  readonly disabled?: boolean;
}

export interface RadioCardsProps<T extends string> {
  readonly name: string;
  readonly legend: string;
  readonly hint?: string;
  readonly value: T;
  readonly options: readonly RadioOption<T>[];
  readonly onChange: (value: T) => void;
  readonly columns?: 2 | 3;
}

/**
 * Grupo de escolhas exclusivas com `<input type="radio">` nativos.
 * Razão de ser: teclado, foco, `fieldset/legend` e anúncio de estado vêm do browser —
 * um controlo custom teria de reproduzir tudo isso para ser equivalente.
 */
export function RadioCards<T extends string>({
  name,
  legend,
  hint,
  value,
  options,
  onChange,
  columns = 3,
}: RadioCardsProps<T>): ReactNode {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      <div
        className={cn("mt-1 grid gap-2", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}
      >
        {options.map((option) => {
          const checked = option.value === value;
          const disabled = option.disabled ?? false;
          return (
            <label
              key={option.value}
              aria-disabled={disabled || undefined}
              className={cn(
                "group relative flex items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors duration-150 ease-quart-out",
                disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                checked
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line-control bg-surface text-ink-secondary hover:border-ink-muted hover:bg-canvas-sunken",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border",
                  checked ? "border-accent" : "border-line-control",
                )}
              >
                <span className={cn("size-1.5 rounded-full", checked ? "bg-accent" : "bg-transparent")} />
              </span>
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-ink-muted">
                    {option.description}
                    {disabled ? " — indisponível" : ""}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
