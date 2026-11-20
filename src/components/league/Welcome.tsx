import { ButtonLink } from "@/components/ui/Button";

/** Ekran dla telefonu, który nie należy jeszcze do żadnej ligi. */
export function Welcome() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-6xl">🎯</p>
        <h2 className="text-2xl font-bold">Zagrajcie w swojej lidze</h2>
        <p className="max-w-xs text-muted">
          Liga zbiera wasze gry i pokazuje wspólny ranking. Załóż nową albo dołącz do ligi znajomych,
          skanując ich kod QR.
        </p>
      </section>
      <div className="flex flex-col gap-3">
        <ButtonLink href="/dolacz">📷 Dołącz do ligi</ButtonLink>
        <ButtonLink href="/liga/nowa" variant="secondary">
          Załóż ligę
        </ButtonLink>
      </div>
      <ButtonLink href="/odzyskaj" variant="ghost" className="mt-2 min-h-11 text-base">
        🔑 Mam kod odzyskiwania ligi
      </ButtonLink>
    </div>
  );
}
