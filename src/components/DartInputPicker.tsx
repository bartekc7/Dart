"use client";

import { useDartInput, type DartInput } from "@/lib/game/storage";

const OPTIONS: { value: DartInput; label: string; hint: string }[] = [
  { value: "pad", label: "Przyciski 1–20", hint: "szybkie na telefonie" },
  { value: "board", label: "Tarcza", hint: "klikasz w pole jak w prawdziwą" },
];

/** Przyciski czy klikalna tarcza – wybór tego urządzenia (inne telefony mają swój). */
export function DartInputPicker() {
  const [input, setInput] = useDartInput();

  return (
    <section aria-labelledby="dart-input-title">
      <h2 id="dart-input-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Wpisywanie rzutek
      </h2>
      <div role="radiogroup" aria-labelledby="dart-input-title" className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => {
          const checked = input === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setInput(o.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center ring-1 ${
                checked ? "bg-surface-2 ring-2 ring-cream" : "bg-surface ring-line"
              }`}
            >
              <span aria-hidden className="flex h-20 items-center justify-center">
                {o.value === "pad" ? <PadIcon /> : <BoardIcon />}
              </span>
              <span className={`text-lg ${checked ? "font-semibold" : "font-medium"}`}>{o.label}</span>
              <span className="text-sm text-muted">{o.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">
        Gdy każdą rzutkę wpisuje się osobno, także w grach 1 na 1 i treningach. Dotyczy tego urządzenia. Domyślnie tarcza na
        komputerze i tablecie, przyciski na telefonie.
      </p>
    </section>
  );
}

function PadIcon() {
  return (
    <span className="grid grid-cols-5 gap-1">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className="h-3 w-3.5 rounded-sm bg-line" />
      ))}
    </span>
  );
}

function BoardIcon() {
  // Uproszczona tarcza: 20 wycinków na przemian, pierścienie double/triple i środek.
  const seg = (r1: number, r2: number, i: number) => {
    const a1 = ((i * 18 - 9 - 90) * Math.PI) / 180;
    const a2 = ((i * 18 + 9 - 90) * Math.PI) / 180;
    const p = (r: number, a: number) => `${20 + r * Math.cos(a)} ${20 + r * Math.sin(a)}`;
    return `M${p(r2, a1)}A${r2} ${r2} 0 0 1 ${p(r2, a2)}L${p(r1, a2)}A${r1} ${r1} 0 0 0 ${p(r1, a1)}Z`;
  };
  return (
    <svg viewBox="0 0 40 40" className="size-20">
      <circle cx="20" cy="20" r="20" fill="#0d0e0f" />
      {Array.from({ length: 20 }, (_, i) => {
        const black = i % 2 === 0;
        return (
          <g key={i}>
            <path d={seg(2.7, 17.6, i)} fill={black ? "#16181a" : "#e9dcc0"} />
            <path d={seg(9.4, 12.2, i)} fill={black ? "#d42a2a" : "#1f9a4a"} />
            <path d={seg(14.8, 17.6, i)} fill={black ? "#d42a2a" : "#1f9a4a"} />
          </g>
        );
      })}
      <circle cx="20" cy="20" r="2.7" fill="#1f9a4a" />
      <circle cx="20" cy="20" r="1.2" fill="#d42a2a" />
    </svg>
  );
}
