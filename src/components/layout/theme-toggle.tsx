"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/lib/preferences-store";
import type { ReactNode } from "react";

/**
 * Alternador de tema.
 *
 * Os ícones trocam por CSS (`[data-theme]`), não por estado de JavaScript: o HTML do
 * servidor e o hidratado são idênticos, pelo que não há mismatch nem flicker. A escolha
 * relativa ao tema aplicado mantém "system" selecionável nas Preferências.
 */
export function ThemeToggle({ size = "sm" }: { readonly size?: "sm" | "md" } = {}): ReactNode {
  const { set } = usePreferences();

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={() => {
        const applied = document.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
        set("theme", applied === "dark" ? "light" : "dark");
      }}
      aria-label="Alternar entre tema claro e escuro"
      title="Tema"
    >
      <Sun className="icon-when-dark" />
      <Moon className="icon-when-light" />
    </Button>
  );
}
