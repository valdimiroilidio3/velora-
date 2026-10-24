"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ui } from "@/i18n/pt";
import { dispatchSearchClear } from "./search-events";
import type { ReactNode } from "react";

/**
 * Limpa todos os parâmetros de filtragem (preservando a vista escolhida) e avisa o campo de
 * pesquisa para esvaziar o valor no DOM. Sem isto, o URL e o input divergiriam até nova tecla.
 */
export function ClearFiltersButton({
  href,
  keepView,
}: {
  readonly href: string;
  readonly keepView: "grid" | "list";
}): ReactNode {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        dispatchSearchClear();
        router.push(keepView === "list" ? `${href}?view=list` : href);
      }}
      className="inline-flex items-center gap-1 rounded-sm text-ink-secondary underline underline-offset-2 transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <RotateCcw aria-hidden="true" className="size-3" />
      {ui.actions.clearFilters}
    </button>
  );
}
