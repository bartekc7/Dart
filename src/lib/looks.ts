import { PLAYER_COLORS } from "./colors";

/**
 * Znak gracza: kolor ALBO ikonka. Każdy znak może mieć w lidze tylko jeden
 * gracz (także nieaktywny). Ikonki mają zastąpić kolorową kropkę, więc są
 * wybrane tak, żeby dobrze wyglądały na iOS i Androidzie (Emoji ≤ 13).
 */
export const PLAYER_ICONS: readonly { icon: string; label: string }[] = [
  { icon: "🐛", label: "Bug" },
  { icon: "🤖", label: "Robot" },
  { icon: "☕", label: "Kawa" },
  { icon: "💾", label: "Dyskietka" },
  { icon: "🔥", label: "Pożar na produkcji" },
  { icon: "🖥️", label: "Komputer" },
  { icon: "⌨️", label: "Klawiatura" },
  { icon: "🖱️", label: "Myszka" },
  { icon: "🦆", label: "Gumowa kaczka" },
  { icon: "🐧", label: "Pingwin" },
  { icon: "🐍", label: "Wąż" },
  { icon: "🦀", label: "Krab" },
  { icon: "🐳", label: "Wieloryb" },
  { icon: "🐘", label: "Słoń" },
  { icon: "🐙", label: "Ośmiornica" },
  { icon: "🚀", label: "Deploy" },
  { icon: "💥", label: "Bum" },
  { icon: "🧯", label: "Gaśnica" },
  { icon: "🍕", label: "Pizza" },
  { icon: "🧠", label: "Mózg" },
  { icon: "👾", label: "Kosmita" },
  { icon: "🕹️", label: "Joystick" },
  { icon: "📟", label: "Pager dyżurny" },
  { icon: "🔌", label: "Wtyczka" },
  { icon: "🧪", label: "Test" },
  { icon: "🙈", label: "Nie widzę błędu" },
  { icon: "💩", label: "Legacy code" },
  { icon: "🤡", label: "Klaun" },
  { icon: "🦄", label: "Jednorożec" },
  { icon: "🥷", label: "Ninja" },
];

export const COLOR_NAMES = [
  "Niebieski",
  "Zielony",
  "Pomarańczowy",
  "Fioletowy",
  "Morski",
  "Różowy",
  "Złoty",
  "Czerwony",
  "Indygo",
  "Turkusowy",
] as const;

/** Klucz znaku: „color:3” albo „icon:🐛”. */
export type LookKey = string;

export interface Look {
  /** Numer koloru (lib/colors) albo null, gdy gracz ma ikonkę. */
  color: number | null;
  icon: string | null;
}

export const ALL_LOOKS: LookKey[] = [
  ...PLAYER_COLORS.map((_, i) => `color:${i}`),
  ...PLAYER_ICONS.map((x) => `icon:${x.icon}`),
];

export function lookKey(look: { color: number | null; icon: string | null }): LookKey {
  if (look.icon) return `icon:${look.icon}`;
  return `color:${((look.color ?? 0) % PLAYER_COLORS.length + PLAYER_COLORS.length) % PLAYER_COLORS.length}`;
}

/** Sprawdza klucz z formularza; null = nieznany znak. */
export function parseLook(raw: unknown): Look | null {
  if (typeof raw !== "string") return null;
  if (raw.startsWith("color:")) {
    const n = Number(raw.slice(6));
    return Number.isInteger(n) && n >= 0 && n < PLAYER_COLORS.length ? { color: n, icon: null } : null;
  }
  if (raw.startsWith("icon:")) {
    const icon = raw.slice(5);
    return PLAYER_ICONS.some((x) => x.icon === icon) ? { color: null, icon } : null;
  }
  return null;
}

/**
 * Znak dla nowego gracza bez wyboru: jak dotąd kolor wg kolejności dołączenia,
 * a gdy jest zajęty – pierwszy wolny kolor, potem pierwsza wolna ikonka.
 * Gdy wszystko zajęte (liga większa niż 40 osób), kolor się powtarza.
 */
export function defaultLook(rank: number, taken: Iterable<LookKey>): Look {
  const busy = new Set(taken);
  const byOrder = rank % PLAYER_COLORS.length;
  if (!busy.has(`color:${byOrder}`)) return { color: byOrder, icon: null };
  const free = ALL_LOOKS.find((k) => !busy.has(k));
  return (free && parseLook(free)) || { color: byOrder, icon: null };
}

/** Znak, który dostanie nowy gracz bez wyboru (taken = znaki wszystkich graczy ligi). */
export function suggestedLook(taken: LookKey[]): LookKey {
  return lookKey(defaultLook(taken.length, taken));
}

/** Znaki zajęte przez graczy ligi (bez `exceptId`). */
export function looksOf(members: { id: string; color: number; icon: string | null }[], exceptId?: string): LookKey[] {
  return members.filter((m) => m.id !== exceptId).map((m) => lookKey(m));
}

export function lookLabel(key: LookKey): string {
  const look = parseLook(key);
  if (!look) return "";
  if (look.icon) return PLAYER_ICONS.find((x) => x.icon === look.icon)?.label ?? look.icon;
  return COLOR_NAMES[look.color!];
}
