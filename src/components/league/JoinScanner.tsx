"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { joinTarget } from "@/lib/joinLink";

type Detect = (video: HTMLVideoElement) => Promise<string | null>;

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/** Wbudowany czytnik (Android/Chrome), a gdzie go nie ma (iPhone), biblioteka jsQR. */
async function makeDetector(): Promise<Detect> {
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike })
    .BarcodeDetector;
  if (Native) {
    try {
      const detector = new Native({ formats: ["qr_code"] });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    } catch {
      // brak obsługi QR – używamy zapasu niżej
    }
  }
  const jsQR = (await import("jsqr")).default;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (video) => {
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

function cameraError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Brak dostępu do aparatu. Zezwól na aparat w ustawieniach przeglądarki albo wklej link poniżej.";
  if (name === "NotFoundError") return "Nie znaleziono aparatu. Wklej link albo wpisz kod poniżej.";
  return "Nie udało się włączyć aparatu. Wklej link albo wpisz kod poniżej.";
}

/** Dołączanie bez otwierania linku: skan kodu QR aparatem albo wklejenie linku / kodu. */
export function JoinScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const detect = await makeDetector();
        let lastBad = "";
        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2 && video.videoWidth) {
            const value = await detect(video).catch(() => null);
            if (value && !stopped) {
              const href = joinTarget(value);
              if (href) {
                stopped = true;
                navigator.vibrate?.(60);
                router.push(href as never);
                return;
              }
              if (value !== lastBad) {
                lastBad = value;
                setError("To nie jest kod ligi Dart. Zeskanuj kod z panelu ligi.");
              }
            }
          }
          timer = window.setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        if (!stopped) {
          setError(cameraError(e));
          setScanning(false);
        }
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, router]);

  function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ta przeglądarka nie obsługuje aparatu. Wklej link albo wpisz kod poniżej.");
      return;
    }
    setScanning(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const href = joinTarget(text);
    if (href) router.push(href as never);
    else setError("Nie rozpoznaję tego. Wklej cały link od znajomych albo wpisz 8-znakowy kod ligi.");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {scanning ? (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-3xl bg-black ring-1 ring-line">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-white/80" />
          </div>
          <p className="text-center text-muted">Skieruj aparat na kod QR z panelu ligi.</p>
          <Button variant="secondary" onClick={() => setScanning(false)}>
            Zatrzymaj aparat
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted">
            Poproś kogoś z ligi o kod QR z panelu ligi i zeskanuj go tutaj.
          </p>
          <Button onClick={start}>📷 Skanuj kod QR</Button>
        </div>
      )}

      <FormError message={error} />

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Albo wklej link lub wpisz kod ligi"
          placeholder="np. EJBDF829"
          value={text}
          spellCheck={false}
          autoCapitalize="characters"
          inputMode="url"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          Dołącz
        </Button>
      </form>
    </div>
  );
}
