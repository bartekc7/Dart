import Link from "next/link";

export function AppHeader({ title, backHref }: { title: React.ReactNode; backHref?: string }) {
  return (
    <header className="mb-6 flex items-center gap-3">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Wróć"
          className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-2xl ring-1 ring-line"
        >
          ‹
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </header>
  );
}
