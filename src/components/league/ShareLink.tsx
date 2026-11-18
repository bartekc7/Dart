"use client";

import { useState } from "react";
import { QrCode } from "./QrCode";

/** Link z kodem QR i przyciskami „Udostępnij” / „Kopiuj”. */
export function ShareLink({ url, title, text }: { url: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-3">
      <QrCode value={url} label={`Kod QR: ${title}`} />
      <p className="truncate rounded-xl bg-surface-2 px-3 py-2 text-center font-mono text-sm text-muted">
        {url.replace(/^https?:\/\//, "")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title, text, url }).catch(() => {})}
            className="min-h-12 rounded-2xl bg-green font-semibold text-white"
          >
            Udostępnij
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className={`min-h-12 rounded-2xl bg-surface-2 font-semibold ring-1 ring-line ${canShare ? "" : "col-span-2"}`}
        >
          {copied ? "Skopiowano ✓" : "Kopiuj link"}
        </button>
      </div>
    </div>
  );
}
