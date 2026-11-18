import { ButtonLink } from "@/components/ui/Button";

/** Ekran dla telefonu, który nie należy jeszcze do żadnej ligi. */
export function Welcome() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-6xl">🎯</p>
        <h2 className="text-2xl font-bold">Zagrajcie w swojej lidze</h2>
        <p className="max-w-xs text-muted">
          Liga zbiera wasze gry i pokazuje wspólny ranking. Załóż ją i wyślij znajomym link albo
          pokaż kod QR.
        </p>
        <div className="mt-2 w-full max-w-xs rounded-2xl bg-surface p-4 text-sm text-muted ring-1 ring-line">
          <span className="font-semibold text-ink">Masz już link od znajomych?</span> Otwórz go na
          tym telefonie, żeby dołączyć.
        </div>
      </section>
      <ButtonLink href="/liga/nowa">Załóż ligę</ButtonLink>
    </div>
  );
}
