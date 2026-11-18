"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useLeague } from "./LeagueProvider";

/**
 * Kod odzyskiwania organizatora. Po zgubieniu telefonu wpisuje się go na nowym
 * (ekran startowy → „mam kod odzyskiwania”). Kod widać tylko raz, przy tworzeniu.
 */
export function RecoveryCode({ hasCode }: { hasCode: boolean }) {
  const { refresh } = useLeague();
  const [code, setCode] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ code: string }>("/api/league/recovery", { method: "POST" });
      setCode(res.code);
      setConfirm(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section id="odzyskiwanie" aria-labelledby="recovery-title">
      <h2 id="recovery-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Kod odzyskiwania
      </h2>
      {code ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-2 ring-cream">
          <p className="text-center font-mono text-2xl font-bold tracking-widest select-all">{code}</p>
          <p className="text-sm">
            <strong>Zapisz go teraz</strong> (zrzut ekranu, notatki albo menedżer haseł). Pokazujemy go tylko raz.
            Gdy zgubisz telefon, otwórz Dart na nowym i wybierz „mam kod odzyskiwania”.
          </p>
          <Button variant="secondary" onClick={copy}>
            {copied ? "Skopiowano ✓" : "Kopiuj kod"}
          </Button>
        </div>
      ) : hasCode ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p className="text-sm">
            ✓ Kod jest utworzony. Gdy zgubisz telefon, wpiszesz go na nowym i znów będziesz organizatorem.
          </p>
          {confirm ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
              <p className="text-sm">Nowy kod unieważni poprzedni. Na pewno?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
                  Anuluj
                </Button>
                <Button onClick={create} disabled={busy}>
                  Utwórz nowy
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)} className="min-h-11 text-base">
              Zgubiłem kod – utwórz nowy
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/40">
          <p className="text-sm">
            ⚠️ Jeśli zgubisz telefon, bez tego kodu nikt nie przejmie roli organizatora. Utwórz go i zapisz w
            bezpiecznym miejscu.
          </p>
          <Button onClick={create} disabled={busy}>
            🔑 Utwórz kod odzyskiwania
          </Button>
        </div>
      )}
      <FormError message={error} />
    </section>
  );
}
