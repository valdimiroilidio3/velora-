import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: { wrapper: "border-info/25 bg-info-soft text-info", icon: <Info /> },
  success: { wrapper: "border-success/25 bg-success-soft text-success", icon: <CheckCircle2 /> },
  warning: { wrapper: "border-warning/35 bg-warning-soft text-warning", icon: <AlertTriangle /> },
  danger: { wrapper: "border-danger/30 bg-danger-soft text-danger", icon: <ShieldAlert /> },
};

export interface AlertProps {
  readonly tone?: AlertTone;
  readonly title?: string;
  readonly action?: ReactNode;
  readonly onDismiss?: () => void;
  readonly dismissLabel?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Mensagem de estado para o utilizador (erro, confirmação, aviso de âmbito).
 * Usa `role="status"` quando é informativa e `role="alert"` quando é erro, para que
 * leitores de ecrã announcesem sem interromper a leitura em curso.
 */
export function Alert({
  tone = "info",
  title,
  action,
  onDismiss,
  dismissLabel = "Dispensar mensagem",
  className,
  children,
}: AlertProps): ReactNode {
  const styles = toneStyles[tone];
  const isCritical = tone === "danger";

  return (
    <div
      role={isCritical ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm",
        styles.wrapper,
        className,
      )}
    >
      <span aria-hidden="true" className="mt-px shrink-0 [&>svg]:size-4">
        {styles.icon}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-ink-secondary [&_a]:underline [&_a]:underline-offset-2">{children}</div>
        {action ? <div className="mt-1.5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <Button
          variant="quiet"
          size="sm"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
