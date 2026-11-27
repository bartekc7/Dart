/**
 * Klikalna tarcza do wpisywania rzutek: geometria i rozpoznawanie pola.
 *
 * Pierścienie double/triple i środek są poszerzone względem prawdziwej tarczy
 * (decyzja Bartosza 2026-11-27), żeby dało się w nie trafić palcem i myszką.
 * Karta trafień (DartboardHeat) zostaje w prawdziwych proporcjach.
 * Układ: viewBox 0–200, środek w (100, 100), promienie w tych jednostkach.
 * Klucze pól jak w zapisie rzutek: "20", "D20", "T20", "25", "D25" (bull), "0" (pudło).
 */
import type { AimHit, AimTarget } from "../training";

/** Kolejność pól zgodnie z ruchem wskazówek zegara, od góry. */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const BOARD_R = {
  bull: 6,
  outerBull: 13.5,
  tripleIn: 47,
  tripleOut: 61,
  doubleIn: 74,
  doubleOut: 88,
  /** Środek czarnego pierścienia z numerami (kliknięcie w niego = pudło). */
  numbers: 94.3,
  rim: 99.5,
} as const;

export function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
}

/** Wycinek pierścienia od kąta a1 do a2 (stopnie, 0 = góra). */
export function arcPath(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r2, a2);
  const [x3, y3] = polar(r1, a2);
  const [x4, y4] = polar(r1, a1);
  const f = (n: number) => Math.round(n * 1000) / 1000;
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 0 0 ${f(x4)} ${f(y4)}Z`;
}

/**
 * Pole pod punktem (x, y w jednostkach viewBox): klucz pola,
 * "0" dla czarnego pierścienia z numerami, null poza tarczą.
 */
export function boardKeyAt(x: number, y: number): string | null {
  const dx = x - 100;
  const dy = y - 100;
  const r = Math.hypot(dx, dy);
  if (r <= BOARD_R.bull) return "D25";
  if (r <= BOARD_R.outerBull) return "25";
  if (r > BOARD_R.rim) return null;
  if (r > BOARD_R.doubleOut) return "0";
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360 + 9) % 360;
  const n = BOARD_ORDER[Math.floor(deg / 18) % 20];
  if (r >= BOARD_R.tripleIn && r <= BOARD_R.tripleOut) return `T${n}`;
  if (r >= BOARD_R.doubleIn) return `D${n}`;
  return String(n);
}

/** Środek pola (zewnętrzne pojedyncze dla zwykłych liczb) – tam stawiamy kropkę rzutki bez znanego miejsca. */
export function boardKeyCenter(key: string): [number, number] | null {
  if (key === "D25") return [100, 100];
  if (key === "25") return polar((BOARD_R.bull + BOARD_R.outerBull) / 2, 135);
  const m = /^([DT]?)(\d{1,2})$/.exec(key);
  if (!m) return null;
  const i = BOARD_ORDER.indexOf(Number(m[2]));
  if (i < 0) return null;
  const r =
    m[1] === "T"
      ? (BOARD_R.tripleIn + BOARD_R.tripleOut) / 2
      : m[1] === "D"
        ? (BOARD_R.doubleIn + BOARD_R.doubleOut) / 2
        : (BOARD_R.tripleOut + BOARD_R.doubleIn) / 2;
  return polar(r, i * 18);
}

/** Wszystkie pola tarczy z punktami (bez pudła). */
const ALL_KEYS: { key: string; value: number }[] = (() => {
  const list: { key: string; value: number }[] = [];
  for (let n = 1; n <= 20; n++) list.push({ key: String(n), value: n }, { key: `D${n}`, value: 2 * n }, { key: `T${n}`, value: 3 * n });
  list.push({ key: "25", value: 25 }, { key: "D25", value: 50 });
  return list;
})();

/** Pola, którymi kończy się równo jedną rzutką (gramy bez wymogu double). */
export function finishingKeys(left: number): string[] {
  return ALL_KEYS.filter((k) => k.value === left).map((k) => k.key);
}

/** Pola celu w treningu „Celowanie” (np. 20, D20, T20 albo 25 i Bull). */
export function aimKeys(target: AimTarget): string[] {
  return target === "25" ? ["25", "D25"] : [target, `D${target}`, `T${target}`];
}

/** Kliknięte pole jako wynik rzutki w „Celowaniu”: inne pole niż cel = pudło. */
export function aimHitFromKey(target: AimTarget, key: string): AimHit {
  if (target === "25") return key === "D25" ? "D" : key === "25" ? "S" : "0";
  if (key === target) return "S";
  if (key === `D${target}`) return "D";
  if (key === `T${target}`) return "T";
  return "0";
}

/** Pola celu w „Dookoła tarczy”: liczba 1–20 (każde jej pole) albo środek (21 = Bull). */
export function clockKeys(field: number, last: number): string[] {
  return field >= last ? ["25", "D25"] : [String(field), `D${field}`, `T${field}`];
}
