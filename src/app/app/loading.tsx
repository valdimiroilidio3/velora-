import { LoadingLabel, ProjectCardSkeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

export default function WorkspaceLoading(): ReactNode {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 border-b border-line pb-6">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
      <LoadingLabel label="A carregar o espaço de trabalho" />
    </div>
  );
}
