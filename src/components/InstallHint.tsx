"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install";

const KEY = "dart:installHintHidden";

/** Dyskretna podpowiedź na starcie: tylko na telefonie i tylko w przeglądarce. */
export function InstallHint() {
  const { ready, standalone, platform } = useInstall();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let value = false;
    try {
      value = localStorage.getItem(KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage dostępny dopiero w przeglądarce
    setHidden(value);
  }, []);

  if (!ready || standalone || platform === "other" || hidden) return null;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line py-1 pr-1 pl-4 text-sm">
      <Link href="/opcje#instaluj" className="flex-1 py-2 text-muted">
        📲 Dodaj Dart do ekranu głównego – <span className="font-semibold text-ink underline">jak?</span>
      </Link>
      <button
        type="button"
        aria-label="Ukryj podpowiedź"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setHidden(true);
        }}
        className="flex size-10 items-center justify-center rounded-full text-muted active:bg-surface-2"
      >
        ✕
      </button>
    </div>
  );
}
