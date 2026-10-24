import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Skeleton({ className }: { readonly className?: string }): ReactNode {
  return <div aria-hidden="true" className={cn("skeleton h-3 w-full", className)} />;
}

/** Esqueleto de cartão de projeto — a mesma silhueta do conteúdo real evita reflow. */
export function ProjectCardSkeleton(): ReactNode {
  return (
    <div className="surface-card overflow-hidden">
      <div className="skeleton h-28 w-full rounded-none" />
      <div className="grid gap-2 p-4">
        <Skeleton className="w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { readonly rows?: number }): ReactNode {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line" role="presentation">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 bg-surface px-4 py-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-full max-w-56" />
          <Skeleton className="ml-auto h-6 w-20 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Anúncio para leitores de ecrã enquanto o conteúdo suspense chega. */
export function LoadingLabel({ label }: { readonly label: string }): ReactNode {
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-ink-muted">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
      />
      {label}
    </p>
  );
}
