import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold " +
  "transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

const variants: Record<Variant, string> = {
  primary: "bg-red text-white shadow-lg shadow-red/20 hover:brightness-110",
  secondary: "bg-surface-2 text-ink ring-1 ring-line hover:bg-line",
  ghost: "text-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
