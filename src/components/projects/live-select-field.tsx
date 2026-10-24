"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { controlClass } from "@/components/ui/field";

export interface LiveSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface LiveSelectFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly options: readonly LiveSelectOption[];
  readonly defaultValue?: string;
}

/**
 * `<select>` nativo que aplica a escolha no momento em que muda, sem botão de submissão.
 * Mantém `name`, pelo que continua a funcionar como controlo de formulário GET sem
 * JavaScript: os dois caminhos escrevem o mesmo URL.
 */
export function LiveSelectField({ id, name, label, options, defaultValue }: LiveSelectFieldProps): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(name);

  // Fonte de verdade: URL > valor inicial do servidor > primeira opção.
  const value = urlValue ?? defaultValue ?? options[0]?.value ?? "";

  function commit(nextValue: string): void {
    const params = new URLSearchParams(searchParams.toString());
    const fallback = options[0]?.value;
    if (nextValue === "" || nextValue === fallback) {
      params.delete(name);
    } else {
      params.set(name, nextValue);
    }
    const query = params.toString();
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-secondary">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => commit(event.target.value)}
        className={`${controlClass} h-9 min-h-0 py-1 text-sm`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
