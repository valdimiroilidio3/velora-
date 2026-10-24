import { cn } from "@/lib/cn";
import { ui } from "@/i18n/pt";
import type { ProjectStatus } from "@/demo/projects";
import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const toneClass: Record<Tone, string> = {
  neutral: "border-line-strong bg-canvas-sunken text-ink-secondary",
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/35 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  accent: "border-accent/30 bg-accent-soft text-accent-ink",
};

export interface StatusPillProps {
  readonly tone?: Tone;
  readonly dot?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function StatusPill({ tone = "neutral", dot, className, children }: StatusPillProps): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const statusTone: Record<ProjectStatus, Tone> = {
  draft: "neutral",
  in_review: "warning",
  published: "success",
  archived: "danger",
};

export const statusOrder: readonly ProjectStatus[] = ["draft", "in_review", "published", "archived"];

export function ProjectStatusPill({ status }: { readonly status: ProjectStatus }): ReactNode {
  return (
    <StatusPill tone={statusTone[status]} dot>
      {ui.status[status]}
    </StatusPill>
  );
}

export function statusHintFor(status: ProjectStatus): string {
  return ui.statusHint[status];
}
