import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Espaço de trabalho",
  description:
    "Área de demonstração da VELORA: catálogo de projetos fictícios, cena volumétrica e preferências visuais.",
  robots: { index: false, follow: false },
};

/**
 * Layout da área `/app`. É aqui que a Fase 1 monta autenticação e contexto de organização
 * (middleware + verificação de sessão antes do `AppShell`). Nesta fase o conteúdo é
 * renderizado para qualquer visitante porque não existe sessão — ver docs/SECURITY.md.
 */
export default function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
