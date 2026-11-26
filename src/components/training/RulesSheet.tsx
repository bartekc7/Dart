"use client";

import { Button } from "@/components/ui/Button";
import { MODE_BY_ID, type TrainingMode } from "@/lib/training";

/** Zasady trybu: krótko, z przykładem. Pokazujemy same przy pierwszym treningu w tym trybie. */
export function RulesSheet({ mode, onClose, first }: { mode: TrainingMode; onClose: () => void; first?: boolean }) {
  const m = MODE_BY_ID[mode];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="ach-toast w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-4xl">{m.icon}</p>
        <h2 id="rules-title" className="mt-2 text-2xl font-bold">
          {first ? `${m.name} – jak to działa?` : m.name}
        </h2>
        <div className="mt-3 flex flex-col gap-3 text-[1.05rem] leading-relaxed">
          {m.rules.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
        <Button className="mt-5" onClick={onClose}>
          {first ? "Zaczynam" : "Rozumiem"}
        </Button>
      </div>
    </div>
  );
}
