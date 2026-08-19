import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Unified button styling for the whole app.
 *
 * `Button`     → renders a native <button> (forms, onClick actions)
 * `ButtonLink` → renders a Next <Link> with IDENTICAL box model
 *
 * Because both share `buttonClasses()`, a row mixing links and buttons
 * (e.g. Edytuj / Ukryj / Usuń) stays pixel-aligned. All variants are
 * `inline-flex items-center`, so no baseline drift between <a> and <button>.
 *
 * Tokens follow DESIGN.md: accent for primary, zinc borders for secondary,
 * red for danger. Hover states are defined once per variant.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "dangerSolid"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonRadius = "md" | "lg" | "full";

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap " +
  "transition-colors cursor-pointer select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]",
  secondary:
    "border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
  danger:
    "on-solid-hover border border-red-500/50 text-red-400 hover:bg-red-600 hover:border-red-600",
  dangerSolid: "on-solid bg-red-700 hover:bg-red-600",
  ghost: "text-zinc-400 hover:text-zinc-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

const RADII: Record<ButtonRadius, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  radius = "lg",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  className?: string;
} = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], RADII[radius], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  radius,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, radius, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({
  variant,
  size,
  radius,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, radius, className })} {...rest}>
      {children}
    </Link>
  );
}
