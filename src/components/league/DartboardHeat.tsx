/**
 * Tarcza z mapą trafień: każde pole (1–20 pojedyncze wewn./zewn., D, T, 25, 50)
 * jest tym mocniej podświetlone, im częściej gracz w nie trafiał.
 * Klucze pól jak w zapisie rzutek: "20", "D20", "T20", "25", "D25" (bull).
 */
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// Promienie jak w prawdziwej tarczy (mm), przeskalowane do viewBox 0–200 (środek 100).
const S = 100 / 190;
const R = {
  bull: 6.35 * S,
  outerBull: 15.9 * S,
  tripleIn: 99 * S,
  tripleOut: 107 * S,
  doubleIn: 162 * S,
  doubleOut: 170 * S,
  numbers: 179 * S,
};

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
}

function arc(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r2, a2);
  const [x3, y3] = polar(r1, a2);
  const [x4, y4] = polar(r1, a1);
  return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4} Z`;
}

// Kolory jak w klasycznej tarczy (np. Winmau): czarne i kremowe pola,
// double/triple czerwone przy czarnych polach i zielone przy kremowych.
const BLACK = "#16181a";
const CREAM = "#e9dcc0";
const RED = "#d42a2a";
const GREEN = "#1f9a4a";
const WIRE = "#c9ccd0";
// Trafienia: niebieskie kropki, dobrze widoczne na czerni, kremie, czerwieni i zieleni.
const HEAT = "#2f7bff";

export function DartboardHeat({ hits }: { hits: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(hits));
  // Kropka w środku pola; pole powierzchni rośnie z liczbą trafień.
  const dots: { key: string; x: number; y: number; r: number; n: number }[] = [];
  const dot = (key: string, x: number, y: number, rMax: number) => {
    const n = hits[key] ?? 0;
    if (n) dots.push({ key, x, y, n, r: Math.max(1.6, rMax * Math.sqrt(n / max)) });
  };
  ORDER.forEach((n, i) => {
    const a = i * 18;
    dot(String(n), ...polar((R.tripleOut + R.doubleIn) / 2, a), 8);
    dot(`T${n}`, ...polar((R.tripleIn + R.tripleOut) / 2, a), 5);
    dot(`D${n}`, ...polar((R.doubleIn + R.doubleOut) / 2, a), 5);
  });
  dot("25", ...polar((R.bull + R.outerBull) / 2, 300), 4);
  dot("D25", 100, 100, 4);

  return (
    <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[22rem]" role="img" aria-label="Tarcza z trafieniami">
      <circle cx="100" cy="100" r="99.5" fill="#0d0e0f" />
      <circle cx="100" cy="100" r="98.6" fill="none" stroke="#f4f4f4" strokeWidth="0.7" />
      {ORDER.map((n, i) => {
        const a1 = i * 18 - 9;
        const a2 = a1 + 18;
        // Pole 20 jest czarne, dalej na przemian.
        const black = i % 2 === 0;
        const base = black ? BLACK : CREAM;
        const color = black ? RED : GREEN;
        const [tx, ty] = polar(R.numbers, i * 18);
        return (
          <g key={n}>
            <g stroke={WIRE} strokeWidth="0.35">
              <path d={arc(R.outerBull, R.tripleIn, a1, a2)} fill={base} />
              <path d={arc(R.tripleIn, R.tripleOut, a1, a2)} fill={color} />
              <path d={arc(R.tripleOut, R.doubleIn, a1, a2)} fill={base} />
              <path d={arc(R.doubleIn, R.doubleOut, a1, a2)} fill={color} />
            </g>
            <text
              x={tx}
              y={ty}
              fill="#ffffff"
              fontSize="8"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {n}
            </text>
          </g>
        );
      })}
      <circle cx="100" cy="100" r={R.outerBull} fill={GREEN} stroke={WIRE} strokeWidth="0.35" />
      <circle cx="100" cy="100" r={R.bull} fill={RED} stroke={WIRE} strokeWidth="0.35" />
      {dots.map((d) => (
        <circle key={d.key} cx={d.x} cy={d.y} r={d.r} fill={HEAT} fillOpacity="0.85" stroke="#fff" strokeWidth="0.6">
          <title>
            {d.key}: {d.n}
          </title>
        </circle>
      ))}
    </svg>
  );
}

/** Nazwa pola do listy, np. T20 → „T20”, D25 → „Bull”. */
export function fieldLabel(key: string) {
  return key === "D25" ? "Bull" : key;
}
