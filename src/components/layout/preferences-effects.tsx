"use client";

import { useEffect, type ReactNode } from "react";
import { preferencesStore } from "@/lib/preferences-store";

/**
 * Liga o estado de preferências ao documento: aplica o que está guardado no arranque e
 * volta a resolver quando o sistema muda (tema escuro automático, `prefers-reduced-motion`).
 *
 * O primeiro pintado é tratado pelo script inline no `layout.tsx` (sem flash); este
 * componente só liga os ouvintes e sincroniza depois da hidratação.
 */
export function PreferencesEffects(): ReactNode {
  useEffect(() => {
    preferencesStore.apply();
    return preferencesStore.watchSystem();
  }, []);

  return null;
}
