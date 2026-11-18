import { ButtonLink } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <svg viewBox="0 0 64 64" className="mb-6 size-28 drop-shadow-xl" aria-hidden>
          <circle cx="32" cy="32" r="30" fill="#e23b3b" />
          <circle cx="32" cy="32" r="22" fill="#f2e3b6" />
          <circle cx="32" cy="32" r="14" fill="#1f9d55" />
          <circle cx="32" cy="32" r="6" fill="#e23b3b" />
        </svg>
        <h1 className="text-4xl font-bold tracking-tight">Dart</h1>
        <p className="mt-2 max-w-xs text-muted">
          Wpisz graczy, rzucajcie i patrzcie, ile zostało do równego.
        </p>
      </section>

      <nav className="flex flex-col gap-3">
        <ButtonLink href="/gra">Nowa gra</ButtonLink>
        <p className="text-center text-sm text-muted">Historia i statystyki – wkrótce</p>
      </nav>
    </main>
  );
}
