import type { Metadata } from "next";
import type { ReactNode } from "react";
import { demoProjects } from "@/demo/projects";
import { EditorView } from "@/components/editor/editor-view";

export const metadata: Metadata = {
  title: "Editor de modelo 3D · VELORA",
  description:
    "Motor de cena, seleção, hierarquia e transformações sobre um modelo volumétrico de demonstração.",
};

/**
 * `searchParams` é uma `Promise` no Next 16. A rota lê o slug do projeto de demonstração e cai no
 * primeiro quando o parâmetro não corresponde a nada: um `?projeto=` escrito à mão não merece uma
 * página de erro decorativa, e o editor diz sempre qual é o modelo que está em cena.
 */
export default async function EditorPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly projeto?: string | string[] }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  const raw = params.projeto;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  const project = demoProjects.find((item) => item.slug === slug) ?? demoProjects[0]!;
  return <EditorView project={project} />;
}
