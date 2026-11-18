"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Kod QR dla linku (zawsze czarny na białym, żeby dobrze się skanował). */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(
      (s) => alive && setSvg(s),
    );
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto aspect-square w-full max-w-56 rounded-2xl bg-white p-3 [&>svg]:size-full"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
