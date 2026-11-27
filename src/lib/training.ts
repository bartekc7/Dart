/**
 * Treningi solo. Osobny świat od gier ligowych: własna tabela w bazie,
 * własne statystyki i rekordy. Nie wpływają na ranking, statystyki ligi
 * ani osiągnięcia. Kod bez Reacta – działa w przeglądarce i na serwerze.
 */

import { DARTS_PER_TURN, fieldValue } from "./game/engine";

export type TrainingMode = "free" | "aim" | "clock" | "checkout";
/** Celowanie: w co. 25 = Bull (25 i 50). */
export type AimTarget = "20" | "19" | "25";

export const AIM_DARTS = 30;
export const CHECKOUT_ROUNDS = 10;
export const CHECKOUT_MIN = 2;
export const CHECKOUT_MAX = 60;
/** Dookoła tarczy: 1–20, na końcu Bull (21). */
export const CLOCK_LAST = 21;
/** Swobodny: rekord średniej liczy się dopiero od tylu rzutek (10 serii), żeby 3 dobre rzutki nie były rekordem. */
export const FREE_RECORD_MIN_DARTS = 30;
/** Swobodny: najwięcej rzutek w jednym treningu (dalej to raczej pomyłka). */
export const FREE_MAX_DARTS = 1500;

/** Rzutka w Celowaniu: single, double, triple (dla Bulla: S = 25, D = 50) albo pudło. */
export type AimHit = "S" | "D" | "T" | "0";

export type TrainingState =
  /** Swobodny: rzutki jako pola („T20”, „D8”, „5”, „25”, „D25”, „0”), serie po 3; `ended` = gracz zakończył. */
  | { mode: "free"; darts: string[]; ended: boolean; startedAt: number }
  | { mode: "aim"; target: AimTarget; darts: AimHit[]; startedAt: number }
  | { mode: "clock"; darts: boolean[]; startedAt: number }
  | { mode: "checkout"; targets: number[]; results: boolean[]; startedAt: number };

export interface ModeInfo {
  mode: TrainingMode;
  icon: string;
  name: string;
  /** Jedno zdanie pod nazwą na liście trybów. */
  short: string;
  /** Zasady: krótko, bez żargonu, z przykładem. */
  rules: string[];
  /** Czy mniejszy wynik jest lepszy. */
  lowerIsBetter: boolean;
}

export const MODES: ModeInfo[] = [
  {
    mode: "free",
    icon: "🧘",
    name: "Swobodny",
    short: "Rzucasz, w co chcesz, i kończysz, kiedy chcesz.",
    rules: [
      "Bez celu i bez zasad: rzucasz, w co chcesz, a po każdej rzutce dotykasz pola, w które trafiła (z Double albo Triple, gdy trzeba). Co 3 rzutki zaczyna się nowa seria.",
      "Kończysz, kiedy chcesz – przyciskiem „Zakończ trening”. Widzisz średnią na serię i najlepszą serię. Przykład: T20, 20 i 5 = seria 85. Rekord średniej liczy się od 30 rzutek.",
    ],
    lowerIsBetter: false,
  },
  {
    mode: "aim",
    icon: "🎯",
    name: "Celowanie",
    short: "30 rzutek w jedno pole: 20, 19 albo Bull.",
    rules: [
      "Wybierz pole i rzuć w nie 30 rzutek. Po każdej rzutce dotknij, gdzie trafiła: w pole, w jego double albo triple, a jeśli w cokolwiek innego – „Pudło”.",
      "Wynik to procent trafień. Przykład: 12 trafień z 30 = 40%. Triple liczy się jak trafienie, a dodatkowo widzisz, ile ich było.",
    ],
    lowerIsBetter: false,
  },
  {
    mode: "clock",
    icon: "🕐",
    name: "Dookoła tarczy",
    short: "Po kolei 1, 2, 3… aż do 20 i na koniec Bull.",
    rules: [
      "Zaczynasz od pola 1. Gdy je trafisz (pojedyncze, double albo triple – bez różnicy), celujesz w 2, potem w 3 i tak dalej do 20. Na koniec trzeba trafić Bulla (25 albo 50).",
      "Po każdej rzutce dotknij „Trafiona” albo „Pudło”. Wynik to liczba rzutek – im mniej, tym lepiej. Przykład: 21 pól w 45 rzutkach = wynik 45.",
    ],
    lowerIsBetter: true,
  },
  {
    mode: "checkout",
    icon: "🏁",
    name: "Kończenie",
    short: "10 losowych końcówek, na każdą masz 3 rzutki.",
    rules: [
      "Aplikacja losuje, ile Ci „zostało” (od 2 do 60). Masz 3 rzutki, żeby zdobyć dokładnie tyle punktów – jak na koniec gry do równego. Podpowiedź pokazuje, w co celować.",
      "Po trzech rzutkach (albo wcześniej, gdy trafisz) dotknij „Udało się” albo „Nie”. Przykład: zostało 36 → trafiasz 16 i 20 = udało się. Wynik to liczba udanych końcówek z 10.",
    ],
    lowerIsBetter: false,
  },
];

export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.mode, m])) as Record<TrainingMode, ModeInfo>;

export const AIM_TARGETS: { id: AimTarget; label: string }[] = [
  { id: "20", label: "20" },
  { id: "19", label: "19" },
  { id: "25", label: "Bull" },
];

/** Nazwa wariantu (dla Celowania – pole), np. „20”, „Bull”. */
export function variantLabel(variant: string): string {
  return variant === "25" ? "Bull" : variant;
}

export function startTraining(mode: TrainingMode, target: AimTarget = "20", random: () => number = Math.random, now = Date.now()): TrainingState {
  if (mode === "free") return { mode, darts: [], ended: false, startedAt: now };
  if (mode === "aim") return { mode, target, darts: [], startedAt: now };
  if (mode === "clock") return { mode, darts: [], startedAt: now };
  const span = CHECKOUT_MAX - CHECKOUT_MIN + 1;
  const targets = Array.from({ length: CHECKOUT_ROUNDS }, () => CHECKOUT_MIN + Math.floor(random() * span));
  return { mode, targets, results: [], startedAt: now };
}

export function isTrainingState(x: unknown): x is TrainingState {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  if (typeof s.startedAt !== "number") return false;
  if (s.mode === "free") return Array.isArray(s.darts) && typeof s.ended === "boolean";
  if (s.mode === "aim") return ["20", "19", "25"].includes(s.target as string) && Array.isArray(s.darts);
  if (s.mode === "clock") return Array.isArray(s.darts);
  if (s.mode === "checkout") return Array.isArray(s.targets) && Array.isArray(s.results);
  return false;
}

/** Kolejne pole w Dookoła tarczy (1–20, 21 = Bull). */
export function clockField(darts: boolean[]): number {
  return 1 + darts.filter(Boolean).length;
}

export function isTrainingOver(s: TrainingState): boolean {
  if (s.mode === "free") return s.ended;
  if (s.mode === "aim") return s.darts.length >= AIM_DARTS;
  if (s.mode === "clock") return clockField(s.darts) > CLOCK_LAST;
  return s.results.length >= s.targets.length;
}

/** Dodaje rzutkę / wynik próby (nic nie robi po końcu). W Swobodnym pole jak „T20” (błędne pomija). */
export function addFree(s: TrainingState, field: string): TrainingState {
  if (s.mode !== "free" || s.ended || fieldValue(field) === null) return s;
  return { ...s, darts: [...s.darts, field] };
}
/** Swobodny: koniec treningu (bez rzutek nie ma czego kończyć). */
export function endFree(s: TrainingState): TrainingState {
  if (s.mode !== "free" || !s.darts.length) return s;
  return { ...s, ended: true };
}
export function addAim(s: TrainingState, hit: AimHit): TrainingState {
  if (s.mode !== "aim" || isTrainingOver(s)) return s;
  return { ...s, darts: [...s.darts, hit] };
}
export function addClock(s: TrainingState, hit: boolean): TrainingState {
  if (s.mode !== "clock" || isTrainingOver(s)) return s;
  return { ...s, darts: [...s.darts, hit] };
}
export function addCheckout(s: TrainingState, ok: boolean): TrainingState {
  if (s.mode !== "checkout" || isTrainingOver(s)) return s;
  return { ...s, results: [...s.results, ok] };
}

export function undoTraining(s: TrainingState): TrainingState {
  if (s.mode === "free") return { ...s, darts: s.darts.slice(0, -1), ended: false };
  if (s.mode === "aim") return { ...s, darts: s.darts.slice(0, -1) };
  if (s.mode === "clock") return { ...s, darts: s.darts.slice(0, -1) };
  return { ...s, results: s.results.slice(0, -1) };
}

export function canUndo(s: TrainingState): boolean {
  return (s.mode === "checkout" ? s.results.length : s.darts.length) > 0;
}

export interface FreeSummary {
  darts: number;
  points: number;
  /** Serie po 3 rzutki (ostatnia może być niepełna), w punktach. */
  series: number[];
  /** Średnio punktów na 3 rzutki (z jednym miejscem po przecinku). */
  per3: number;
  /** Najlepsza seria (0, gdy brak rzutek). */
  bestSeries: number;
}

export function freeSummary(darts: string[]): FreeSummary {
  const values = darts.map((d) => fieldValue(d) ?? 0);
  const series: number[] = [];
  for (let i = 0; i < values.length; i += DARTS_PER_TURN)
    series.push(values.slice(i, i + DARTS_PER_TURN).reduce((a, b) => a + b, 0));
  const points = values.reduce((a, b) => a + b, 0);
  return {
    darts: values.length,
    points,
    series,
    per3: values.length ? Math.round((points / values.length) * 30) / 10 : 0,
    bestSeries: series.reduce((a, b) => Math.max(a, b), 0),
  };
}

/** Punkty jednej rzutki w Celowaniu. */
export function aimPoints(target: AimTarget, hit: AimHit): number {
  if (hit === "0") return 0;
  const base = Number(target);
  if (target === "25") return hit === "D" ? 50 : 25;
  return base * (hit === "T" ? 3 : hit === "D" ? 2 : 1);
}

export interface AimSummary {
  thrown: number;
  hits: number;
  doubles: number;
  triples: number;
  points: number;
  /** Procent trafień z rzuconych rzutek (0–100, liczba całkowita). */
  percent: number;
  /** Średnio punktów na 3 rzutki. */
  per3: number;
}

export function aimSummary(target: AimTarget, darts: AimHit[]): AimSummary {
  const hits = darts.filter((d) => d !== "0").length;
  const points = darts.reduce((n, d) => n + aimPoints(target, d), 0);
  return {
    thrown: darts.length,
    hits,
    doubles: darts.filter((d) => d === "D").length,
    triples: darts.filter((d) => d === "T").length,
    points,
    percent: darts.length ? Math.round((hits / darts.length) * 100) : 0,
    per3: darts.length ? Math.round((points / darts.length) * 30) / 10 : 0,
  };
}

/** Zapis treningu (do bazy). `score` to główny wynik trybu. */
export interface TrainingRecord {
  id: string;
  mode: TrainingMode;
  /** Celowanie: pole (20/19/25), inne tryby: "". */
  variant: string;
  score: number;
  data: TrainingState;
  startedAt: number;
  finishedAt: number;
}

/** Główny wynik: Swobodny – średnia na 3 rzutki, Celowanie – % trafień, Dookoła – liczba rzutek, Kończenie – udane z 10. */
export function trainingScore(s: TrainingState): number {
  if (s.mode === "free") return freeSummary(s.darts).per3;
  if (s.mode === "aim") return aimSummary(s.target, s.darts).percent;
  if (s.mode === "clock") return s.darts.length;
  return s.results.filter(Boolean).length;
}

export function trainingVariant(s: TrainingState): string {
  return s.mode === "aim" ? s.target : "";
}

/** Wynik z jednostką, np. „45,3 śr.”, „40%”, „45 rzutek”, „6 z 10”. */
export function formatScore(mode: TrainingMode, score: number): string {
  if (mode === "free") return `${score.toFixed(1).replace(".", ",")} śr.`;
  if (mode === "aim") return `${score}%`;
  if (mode === "checkout") return `${score} z ${CHECKOUT_ROUNDS}`;
  return `${score} ${dartsWord(score)}`;
}

export function dartsWord(n: number): string {
  if (n === 1) return "rzutka";
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return few ? "rzutki" : "rzutek";
}

/** Swobodny: czy trening jest dość długi, żeby jego średnia mogła być rekordem. */
export function countsForRecord(t: { mode: TrainingMode; data?: TrainingState }): boolean {
  if (t.mode !== "free") return true;
  return !!t.data && t.data.mode === "free" && t.data.darts.length >= FREE_RECORD_MIN_DARTS;
}

const better = (mode: TrainingMode, a: number, b: number) => (MODE_BY_ID[mode].lowerIsBetter ? a < b : a > b);

export interface TrainingStats {
  count: number;
  best: TrainingRecord | null;
  /** Średni wynik z ostatnich (najwyżej) 10. */
  recentAvg: number | null;
  /** Zmiana: średnia 10 ostatnich minus średnia 10 wcześniejszych (null, gdy za mało). */
  trend: number | null;
  /** Wyniki od najstarszego (do wykresu, najwyżej 30 ostatnich). */
  series: number[];
}

/** Statystyki jednego trybu i wariantu z listy treningów (dowolna kolejność). */
export function trainingStats(list: TrainingRecord[], mode: TrainingMode, variant: string): TrainingStats {
  const mine = list
    .filter((t) => t.mode === mode && t.variant === variant)
    .sort((a, b) => a.finishedAt - b.finishedAt);
  let best: TrainingRecord | null = null;
  for (const t of mine) if (countsForRecord(t) && (!best || better(mode, t.score, best.score))) best = t;
  const avg = (xs: TrainingRecord[]) => (xs.length ? xs.reduce((n, t) => n + t.score, 0) / xs.length : null);
  const last = mine.slice(-10);
  const before = mine.slice(-20, -10);
  const recentAvg = avg(last);
  const prevAvg = avg(before);
  return {
    count: mine.length,
    best,
    recentAvg,
    trend: recentAvg !== null && prevAvg !== null && before.length >= 3 ? recentAvg - prevAvg : null,
    series: mine.slice(-30).map((t) => t.score),
  };
}

/** Czy wynik bije dotychczasowy rekord treningu (pierwszy trening to nie rekord; remis też nie). */
export function isTrainingRecord(
  list: TrainingRecord[],
  t: Pick<TrainingRecord, "mode" | "variant" | "score" | "id"> & { data?: TrainingState },
): TrainingRecord | null {
  if (!countsForRecord(t)) return null;
  const prev = trainingStats(
    list.filter((x) => x.id !== t.id),
    t.mode,
    t.variant,
  ).best;
  return prev && better(t.mode, t.score, prev.score) ? prev : null;
}

const freeDarts = (t: TrainingRecord) => (t.data?.mode === "free" ? t.data.darts : []);

export interface FreeTotals {
  count: number;
  darts: number;
  /** Średnio na 3 rzutki ze wszystkich rzutek (dłuższy trening waży więcej). */
  per3: number;
  /** Średnio na 3 rzutki z ostatnich (najwyżej) 10 treningów. */
  recentPer3: number;
  bestSeries: number;
  /** Trening z najlepszą serią (pierwszy, który ją rzucił). */
  bestSeriesId: string | null;
  /** Łączny czas treningów w minutach. */
  minutes: number;
}

/** Podsumowanie wszystkich treningów Swobodnych. */
export function freeTotals(list: TrainingRecord[]): FreeTotals {
  const mine = list.filter((t) => t.mode === "free").sort((a, b) => a.finishedAt - b.finishedAt);
  const per3 = (xs: TrainingRecord[]) => {
    const sums = xs.map((t) => freeSummary(freeDarts(t)));
    const darts = sums.reduce((n, x) => n + x.darts, 0);
    return darts ? Math.round((sums.reduce((n, x) => n + x.points, 0) / darts) * 30) / 10 : 0;
  };
  let bestSeries = 0;
  let bestSeriesId: string | null = null;
  for (const t of mine) {
    const b = freeSummary(freeDarts(t)).bestSeries;
    if (b > bestSeries) [bestSeries, bestSeriesId] = [b, t.id];
  }
  return {
    count: mine.length,
    darts: mine.reduce((n, t) => n + freeDarts(t).length, 0),
    per3: per3(mine),
    recentPer3: per3(mine.slice(-10)),
    bestSeries,
    bestSeriesId,
    minutes: Math.round(mine.reduce((n, t) => n + Math.max(0, t.finishedAt - t.startedAt), 0) / 60000),
  };
}

/** Swobodny: czy najlepsza seria bije dotychczasową (pierwszy trening to nie rekord; remis też nie). Zwraca poprzednią. */
export function isFreeSeriesRecord(list: TrainingRecord[], id: string, darts: string[]): number | null {
  const others = list.filter((t) => t.id !== id && t.mode === "free");
  if (!others.length) return null;
  const prev = freeTotals(others).bestSeries;
  return freeSummary(darts).bestSeries > prev ? prev : null;
}

/** Ostatnie wpisy treningu jako „pigułki” pod wynikiem – żeby każde dotknięcie było widać. */
export type RecentThrow = { label: string; kind: "miss" | "hit" | "double" | "triple" };

export function recentThrows(s: TrainingState, n = 5): RecentThrow[] {
  const out: RecentThrow[] = [];
  if (s.mode === "aim") {
    const bull = s.target === "25";
    for (const h of s.darts)
      out.push(
        h === "0"
          ? { label: "pudło", kind: "miss" }
          : bull
            ? { label: h === "D" ? "50" : "25", kind: h === "D" ? "double" : "hit" }
            : { label: `${h === "S" ? "" : h}${s.target}`, kind: h === "T" ? "triple" : h === "D" ? "double" : "hit" },
      );
  } else if (s.mode === "clock") {
    let field = 1;
    for (const hit of s.darts) {
      const name = field === CLOCK_LAST ? "Bull" : String(field);
      out.push(hit ? { label: `✓ ${name}`, kind: "hit" } : { label: `✗ ${name}`, kind: "miss" });
      if (hit) field++;
    }
  } else if (s.mode === "checkout") {
    s.results.forEach((ok, i) => out.push({ label: `${ok ? "✓" : "✗"} ${s.targets[i]}`, kind: ok ? "hit" : "miss" }));
  }
  return out.slice(-n);
}
