/**
 * Rejestr zdarzeń dla panelu admina: tylko rodzaj akcji i czas (bez wyników).
 * Wspólne dla serwera (zapis) i panelu (opisy).
 */
export const EVENT_TYPES = {
  app_open: { label: "Wejście do aplikacji", icon: "📱" },
  league_create: { label: "Założenie ligi", icon: "🏁" },
  league_join: { label: "Dołączenie do ligi", icon: "➕" },
  device_claim: { label: "Nowe urządzenie gracza", icon: "📲" },
  recover: { label: "Odzyskanie ligi kodem", icon: "🔑" },
  rename: { label: "Zmiana nazwy", icon: "✏️" },
  game_start: { label: "Start gry", icon: "🎯" },
  game_end: { label: "Koniec gry", icon: "🏆" },
  game_cancel: { label: "Anulowanie gry", icon: "✕" },
  training_start: { label: "Start treningu", icon: "🏋️" },
  training_end: { label: "Koniec treningu", icon: "✅" },
  duel_invite: { label: "Zaproszenie 1 na 1", icon: "✉️" },
  duel_start: { label: "Start 1 na 1", icon: "⚔️" },
  duel_end: { label: "Koniec 1 na 1", icon: "🏅" },
  duel_cancel: { label: "Anulowanie 1 na 1", icon: "✕" },
  duel_decline: { label: "Odrzucenie 1 na 1", icon: "🚫" },
} as const;

export type EventType = keyof typeof EVENT_TYPES;

/** Zdarzenia, które zgłasza sam telefon (reszta zapisuje się po stronie serwera). */
export const CLIENT_EVENTS: readonly EventType[] = ["app_open", "training_start"];

/** Ile dni trzymamy wpisy rejestru. */
export const EVENTS_KEEP_DAYS = 90;
/** Wejście do aplikacji z tego samego urządzenia liczymy najwyżej raz na tyle minut. */
export const APP_OPEN_EVERY_MIN = 30;

export function isEventType(v: unknown): v is EventType {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(EVENT_TYPES, v);
}

export function isClientEvent(v: unknown): v is EventType {
  return isEventType(v) && CLIENT_EVENTS.includes(v);
}

export function eventLabel(type: string): { label: string; icon: string } {
  return isEventType(type) ? EVENT_TYPES[type] : { label: type, icon: "•" };
}

/** Dzień kalendarzowy w Polsce (YYYY-MM-DD). */
export function warsawDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export interface DayCount {
  day: string;
  games: number;
  trainings: number;
  duels: number;
}

/**
 * Seria dzienna z ostatnich `days` dni (najstarszy pierwszy), z zerami
 * w dniach bez gier. `rows` mają dzień w formacie YYYY-MM-DD.
 */
export function fillDays(
  rows: { day: string; kind: "games" | "trainings" | "duels"; count: number }[],
  days: number,
  now = new Date(),
): DayCount[] {
  const out: DayCount[] = [];
  const index = new Map<string, DayCount>();
  // Idziemy po południu, żeby zmiana czasu nie zjadła ani nie zdublowała dnia.
  const noon = new Date(`${warsawDay(now)}T12:00:00Z`).getTime();
  for (let i = days - 1; i >= 0; i--) {
    const day = warsawDay(new Date(noon - i * 86_400_000));
    const row = { day, games: 0, trainings: 0, duels: 0 };
    out.push(row);
    index.set(day, row);
  }
  for (const r of rows) {
    const row = index.get(r.day);
    if (row) row[r.kind] += r.count;
  }
  return out;
}

/** „5 min temu”, „wczoraj 18:04”, „12.11 9:30” – krótko, po polsku, czas polski. */
export function agoLabel(at: Date | string | null, now = new Date()): string {
  if (!at) return "—";
  const d = typeof at === "string" ? new Date(at) : at;
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "przed chwilą";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min temu`;
  const time = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }).format(d);
  const day = warsawDay(d);
  if (day === warsawDay(now)) return `dziś ${time}`;
  if (day === warsawDay(new Date(now.getTime() - 86_400_000))) return `wczoraj ${time}`;
  const [y, m, dd] = day.split("-");
  const sameYear = y === warsawDay(now).slice(0, 4);
  return `${dd}.${m}${sameYear ? "" : `.${y}`} ${time}`;
}
