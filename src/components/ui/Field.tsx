import type { ComponentProps } from "react";

export function Field({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold uppercase tracking-wider text-muted">{label}</span>
      <input
        autoComplete="off"
        className="min-h-14 w-full min-w-0 rounded-2xl bg-surface-2 px-4 text-lg ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-cream"
        {...props}
      />
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red/10 px-3 py-2 text-sm font-medium text-red">
      {message}
    </p>
  );
}
