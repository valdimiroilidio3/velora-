import { clsx, type ClassValue } from "clsx";

/**
 * Composição de classes condicionais.
 *
 * Nota deliberada: não usamos `tailwind-merge`. O design system proíbe utilitários
 * em conflito dentro do mesmo componente (as variações são tabelas fechadas em
 * `src/components/ui/*`), pelo que a fusão de classes seria complexidade sem uso.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
