import { DEMO_NOTICE } from "@/demo/projects";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Selo de origem dos dados. Obrigatório em qualquer superfície que mostre
 * conteúdo de demonstração — é o que impede que a maquete pareça produto real.
 */
export function DemoBadge({ className }: { readonly className?: string }): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-dashed border-warning/50 px-1.5 py-0.5 text-2xs font-semibold text-warning",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-warning" />
      Demonstração
    </span>
  );
}

export function DemoNotice({ className }: { readonly className?: string }): ReactNode {
  return (
    <p className={cn("max-w-[var(--prose-max)] text-xs leading-relaxed text-ink-muted", className)}>
      <span className="font-semibold text-ink-secondary">Dados fictícios.</span> {DEMO_NOTICE}
    </p>
  );
}
