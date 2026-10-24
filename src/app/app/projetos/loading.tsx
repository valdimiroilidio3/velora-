import type { ReactNode } from "react";
import { LoadingLabel, ProjectCardSkeleton } from "@/components/ui/skeleton";
import { ui } from "@/i18n/pt";

export default function ProjectsLoading(): ReactNode {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 border-b border-line pb-6">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-4 w-full max-w-lg" />
      </div>
      <div className="surface-card grid gap-3 p-4">
        <div className="skeleton h-9 w-full max-w-md" />
        <div className="skeleton h-3 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
      <LoadingLabel label={`${ui.projects.title} — ${ui.feedback.loading}`} />
    </div>
  );
}
