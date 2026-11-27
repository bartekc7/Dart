"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { arcPath, BOARD_ORDER, BOARD_R as R, boardKeyAt, polar } from "@/lib/game/board";
import { fieldValue } from "@/lib/game/engine";

/*
 * Klikalna tarcza do wpisywania rzutek (drugi tryb zamiast przycisków 1–20).
 * Komputer: najechanie pokazuje pole i punkty, kliknięcie zapisuje.
 * Dotyk: stuknięcie zapisuje od razu; przytrzymanie pokazuje lupę nad palcem,
 * można przesunąć palec, a puszczenie zapisuje pole pod nim.
 * Czarny pierścień z numerami = pudło.
 */

// Kolory jak na karcie trafień (wygląd tarczy Winmau).
const BLACK = "#16181a";
const CREAM = "#e9dcc0";
const RED = "#d42a2a";
const GREEN = "#1f9a4a";
const WIRE = "#c9ccd0";
const FIN = "#4ade80";
const HINT = "#38bdf8";
const TARGET = "#fbbf24";

type Seg = { key: string; d: string; fill: string };

const circle = (r: number) => `M${100 - r} 100a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const RING = `${circle(R.rim)}${circle(R.doubleOut)}`;

const SEGMENTS: Seg[] = (() => {
  const out: Seg[] = [];
  BOARD_ORDER.forEach((n, i) => {
    const a1 = i * 18 - 9;
    const a2 = a1 + 18;
    // Pole 20 jest czarne, dalej na przemian; double/triple czerwone przy czarnych, zielone przy kremowych.
    const black = i % 2 === 0;
    const base = black ? BLACK : CREAM;
    const color = black ? RED : GREEN;
    out.push(
      { key: String(n), d: arcPath(R.outerBull, R.tripleIn, a1, a2), fill: base },
      { key: `T${n}`, d: arcPath(R.tripleIn, R.tripleOut, a1, a2), fill: color },
      { key: String(n), d: arcPath(R.tripleOut, R.doubleIn, a1, a2), fill: base },
      { key: `D${n}`, d: arcPath(R.doubleIn, R.doubleOut, a1, a2), fill: color },
    );
  });
  out.push({ key: "25", d: circle(R.outerBull), fill: GREEN }, { key: "D25", d: circle(R.bull), fill: RED });
  return out;
})();

/** Nazwa pola w dymku: „T20”, „Bull”, „Pudło”. */
export function boardLabel(key: string): string {
  return key === "D25" ? "Bull" : key === "0" ? "Pudło" : key;
}

interface Look {
  /** Pola kończące jedną rzutką – zielona obwódka, reszta przygaszona. */
  finish?: string[];
  /** Pierwsza rzutka z podpowiedzi zakończenia – niebieska przerywana obwódka. */
  hint?: string | null;
  /** Cel treningu – żółta obwódka, reszta przygaszona. */
  targets?: string[];
  hover?: string | null;
}

function Drawing({ finish = [], hint = null, targets = [], hover = null, marks = [] }: Look & { marks?: Mark[] }) {
  const lit = new Set([...finish, ...targets]);
  const dim = lit.size > 0;
  const outline = (keys: Set<string>, stroke: string, extra?: React.SVGProps<SVGPathElement>) =>
    SEGMENTS.filter((s) => keys.has(s.key)).map((s, i) => (
      <path key={`${stroke}-${s.key}-${i}`} d={s.d} fill="none" stroke={stroke} strokeWidth="1.6" pointerEvents="none" {...extra} />
    ));
  return (
    <>
      <path d={RING} fillRule="evenodd" fill="#0d0e0f" />
      <circle cx="100" cy="100" r="98.6" fill="none" stroke="#f4f4f4" strokeWidth="0.7" />
      <g stroke={WIRE} strokeWidth="0.35">
        {SEGMENTS.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill={s.fill}
            opacity={dim && !lit.has(s.key) ? 0.5 : 1}
            style={hover === s.key ? { filter: "brightness(1.35)" } : undefined}
          />
        ))}
      </g>
      {BOARD_ORDER.map((n, i) => {
        const [x, y] = polar(R.numbers, i * 18);
        const on = finish.some((k) => k.replace(/^[DT]/, "") === String(n));
        return (
          <text
            key={n}
            x={x}
            y={y}
            fill={on ? FIN : "#ffffff"}
            fontSize="8.5"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            pointerEvents="none"
          >
            {n}
          </text>
        );
      })}
      {outline(new Set(finish), FIN)}
      {outline(new Set(targets), TARGET)}
      {hint && outline(new Set([hint]), HINT, { strokeDasharray: "3 2", strokeWidth: 1.5 })}
      {hover && hover !== "0" && outline(new Set([hover]), "#ffffff", { strokeWidth: 1.2 })}
      {marks.map(([x, y, n], i) => (
        <g key={i} pointerEvents="none">
          <circle cx={x} cy={y} r="4.2" fill="#2f7bff" stroke="#fff" strokeWidth="0.9" />
          <text x={x} y={y + 0.3} fontSize="5" fontWeight="800" fill="#fff" textAnchor="middle" dominantBaseline="central">
            {n}
          </text>
        </g>
      ))}
    </>
  );
}

/** Kropka rzutki: miejsce (jednostki tarczy) i numer rzutki w serii. */
export type Mark = [number, number, number];

type Press = { key: string | null; x: number; y: number; cx: number; cy: number };

const ZOOM = 2.2;
const LOUPE = 132;

export function DartBoard({
  onPick,
  finish,
  hint,
  targets,
  marks,
}: Look & {
  /** Wybrane pole ("0" = pudło) i miejsce kliknięcia w jednostkach tarczy (do kropki). */
  onPick: (key: string, x: number, y: number) => void;
  marks?: Mark[];
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(0);
  const [hover, setHover] = useState<Press | null>(null);
  const [press, setPress] = useState<Press | null>(null);
  const [loupe, setLoupe] = useState(false);
  // Błysk zapisanego pola – widać, że stuknięcie trafiło (n restartuje animację).
  const [flash, setFlash] = useState<{ key: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tarcza tak duża, jak się da: w poziomie cała wysokość kolumny, w pionie szerokość
  // (z miejscem na nagłówek, pasek rzutek i co najmniej dwóch graczy).
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const land = window.matchMedia("(min-width: 48rem) and (orientation: landscape)");
    const measure = () => {
      const w = el.clientWidth;
      const h = land.matches ? el.clientHeight : Math.max(240, window.innerHeight - 380);
      setSize(Math.max(200, Math.floor(Math.min(w, h || w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function at(e: React.PointerEvent): Press {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200;
    const y = ((e.clientY - r.top) / r.height) * 200;
    return { key: boardKeyAt(x, y), x, y, cx: e.clientX, cy: e.clientY };
  }

  function end(e: React.PointerEvent, commit: boolean) {
    if (timer.current) clearTimeout(timer.current);
    setLoupe(false);
    if (!press) return;
    const p = at(e);
    setPress(null);
    if (commit && p.key) {
      setFlash((f) => ({ key: p.key!, n: (f?.n ?? 0) + 1 }));
      onPick(p.key, p.x, p.y);
    }
  }

  const live = press ?? hover;
  const tip = hover && !press && hover.key ? hover : null;
  const finishing = tip ? (finish ?? []).includes(tip.key!) : false;
  const span = size ? (LOUPE / ZOOM / size) * 200 : 40;

  return (
    <div ref={wrap} className="relative flex min-h-0 justify-center land:flex-1">
      <svg
        ref={svg}
        viewBox="0 0 200 200"
        width={size || undefined}
        height={size || undefined}
        role="application"
        aria-label="Tarcza – kliknij pole, w które trafiła rzutka. Czarny pierścień to pudło."
        className={`touch-none select-none ${size ? "" : "aspect-square w-full"}`}
        style={{ cursor: "pointer", WebkitTouchCallout: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          const p = at(e);
          setPress(p);
          if (e.pointerType !== "mouse") {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
            // Lupa dopiero po chwili, żeby nie migała przy szybkim stuknięciu.
            timer.current = setTimeout(() => setLoupe(true), 150);
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") setHover(at(e));
          if (press) setPress(at(e));
        }}
        onPointerUp={(e) => end(e, true)}
        onPointerCancel={(e) => end(e, false)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") {
            setHover(null);
            setPress(null);
          }
        }}
      >
        <Drawing finish={finish} hint={hint} targets={targets} hover={live?.key ?? null} marks={marks} />
        {flash && (
          <g key={flash.n} className="board-flash" pointerEvents="none" aria-hidden>
            {flash.key === "0" ? (
              <path d={RING} fillRule="evenodd" fill="#ffffff" />
            ) : (
              SEGMENTS.filter((g) => g.key === flash.key).map((g, i) => <path key={i} d={g.d} fill="#ffffff" />)
            )}
          </g>
        )}
      </svg>

      {tip && (
        <div
          className={`pointer-events-none fixed z-30 rounded-xl px-3 py-1.5 text-lg font-bold whitespace-nowrap text-white shadow-lg ring-1 ring-white/15 ${finishing ? "bg-[#14532d]" : "bg-[#0b0f0d]"}`}
          style={{
            left: tip.cx,
            top: tip.cy,
            transform: tip.cx > window.innerWidth - 240 ? "translate(calc(-100% - 16px), -130%)" : "translate(16px, -130%)",
          }}
        >
          {boardLabel(tip.key!)}{" "}
          <span className="text-sm font-medium opacity-75">
            {fieldValue(tip.key!) ?? 0} pkt{finishing ? " · kończy!" : ""}
          </span>
        </div>
      )}

      {press && loupe && size > 0 && (
        <>
          <div
            className="pointer-events-none fixed z-30 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 ring-2 ring-white/60"
            style={{ left: press.cx, top: press.cy }}
          />
          <div
            className="pointer-events-none fixed z-40 overflow-hidden rounded-full shadow-2xl ring-[3px] ring-white"
            style={{ left: press.cx, top: Math.max(press.cy - 38, LOUPE + 8), width: LOUPE, height: LOUPE, transform: "translate(-50%, -100%)" }}
          >
            <svg viewBox={`${press.x - span / 2} ${press.y - span / 2} ${span} ${span}`} width={LOUPE} height={LOUPE} className="bg-board">
              <Drawing finish={finish} targets={targets} hover={press.key} />
            </svg>
            <svg viewBox="0 0 132 132" className="absolute inset-0" width={LOUPE} height={LOUPE}>
              <path d="M66 54v8M66 70v8M54 66h8M70 66h8" stroke="#fff" strokeWidth="2.5" />
              <circle cx="66" cy="66" r="3" fill="#2f7bff" stroke="#fff" />
            </svg>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-2.5 py-0.5 text-[15px] font-extrabold whitespace-nowrap text-white">
              {press.key === null ? "–" : press.key === "0" ? "Pudło" : `${boardLabel(press.key)} · ${fieldValue(press.key)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
