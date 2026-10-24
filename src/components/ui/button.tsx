import { cn } from "@/lib/cn";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-quart-out " +
  "active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-accent text-ink-on-accent hover:bg-accent-hover active:bg-accent-active shadow-e1",
  secondary: "border border-line-control bg-surface text-ink hover:bg-canvas-sunken active:bg-canvas",
  quiet: "text-ink-secondary hover:text-ink hover:bg-canvas-sunken",
  danger: "border border-danger/60 bg-danger-soft text-danger hover:border-danger",
  ghost: "text-ink-muted hover:text-ink",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3.5 text-sm",
  lg: "h-11 px-5 text-sm",
};

/** Exportada para que `next/link` (e futuros `<Button asChild>`) reutilizem o mesmo estilo. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  options: { readonly fullWidth?: boolean; readonly className?: string } = {},
): string {
  return cn(base, variantClass[variant], sizeClass[size], options.fullWidth && "w-full", options.className);
}

function IconFrame({
  children,
  side,
}: {
  readonly children?: ReactNode;
  readonly side: "left" | "right";
}): ReactNode {
  if (children === undefined || children === null) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("shrink-0 [&>svg]:size-4", side === "left" ? "-ml-0.5" : "-mr-0.5")}
    >
      {children}
    </span>
  );
}

interface CommonProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  readonly variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button type={type} className={buttonClass(variant, size, { fullWidth, className })} {...rest}>
      <IconFrame side="left">{leadingIcon}</IconFrame>
      {children}
      <IconFrame side="right">{trailingIcon}</IconFrame>
    </button>
  );
}

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement>, CommonProps {
  readonly variant?: ButtonVariant;
}

/** Âncora com o estilo de botão, para navegação real (mantém semântica de link). */
export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: LinkButtonProps): ReactNode {
  return (
    <a className={buttonClass(variant, size, { fullWidth, className })} {...rest}>
      <IconFrame side="left">{leadingIcon}</IconFrame>
      {children}
      <IconFrame side="right">{trailingIcon}</IconFrame>
    </a>
  );
}
