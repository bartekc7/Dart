import type { Turn } from "./types";

/*
 * Osiągnięcia graczy. Liczymy je z zapisanych gier (bez osobnej tabeli),
 * gra po grze w kolejności rozegrania. Ten sam kod działa na serwerze
 * (cała historia ligi) i w telefonie (trwająca gra dokładana do historii),
 * więc dymek w trakcie gry i lista w wynikach zawsze się zgadzają.
 *
 * Liczą się tylko gry co najmniej dwóch graczy (jak w rankingu).
 * Osiągnięcia oznaczone `darts` wymagają trybu „każda rzutka osobno”,
 * bo potrzebują trafionych pól (Turn.fields) albo liczby rzutek.
 */

export type Tier = "basic" | "short" | "special" | "long" | "legend";

export const TIERS: { id: Tier; name: string }[] = [
  { id: "basic", name: "Podstawowe" },
  { id: "short", name: "Krótkoterminowe" },
  { id: "special", name: "Specjalistyczne" },
  { id: "long", name: "Długoterminowe" },
  { id: "legend", name: "Legendarne" },
];

export interface Achievement {
  id: number;
  name: string;
  desc: string;
  tier: Tier;
  icon: string;
  /** Wymaga wpisywania każdej rzutki osobno. */
  darts?: boolean;
}

const A = (id: number, tier: Tier, icon: string, name: string, desc: string, darts = false): Achievement => ({
  id,
  tier,
  icon,
  name,
  desc,
  ...(darts ? { darts } : {}),
});

export const ACHIEVEMENTS: Achievement[] = [
  A(1, "basic", "🩸", "Pierwsza krew", "Traf pole 1 (pojedyncze, double albo triple).", true),
  A(2, "basic", "🦅", "Oko Sokoła", "Seria bez ani jednego punktu.", false),
  A(3, "basic", "🏁", "W końcu do zera", "Wygraj swój pierwszy mecz."),
  A(4, "basic", "🙋", "Przegrany, ale obecny", "Przegraj swój pierwszy mecz (każde miejsce poza 1.)."),
  A(5, "basic", "🎯", "W samo sedno!", "Traf jedną rzutką pole za co najmniej 20 punktów.", true),
  A(6, "basic", "🪖", "Rekrut", "Rozegraj 5 meczów."),
  A(7, "basic", "✌️", "Podwójna radość", "Traf dowolne pole double.", true),
  A(8, "basic", "🍀", "Potrójne szczęście", "Traf dowolne pole triple.", true),
  A(9, "basic", "0️⃣", "Zero absolutne", "Ukończ pierwszą grę – zejdź dokładnie do 0 (miejsce nie ma znaczenia)."),
  A(10, "basic", "✨", "Dwa do jednego", "Wygraj 2 mecze z rzędu."),
  A(11, "basic", "🎼", "Człowiek orkiestra", "Traf co najmniej raz każde pole tarczy (62 pola).", true),
  A(12, "basic", "2️⃣", "Piękna dwudziestka", "Traf pojedyncze 20.", true),

  A(13, "short", "🔭", "Snajper", "Traf 3 razy pole 20 w jednej kolejce (single, double lub triple).", true),
  A(14, "short", "🪒", "O włos od kompromitacji", "Wygraj mecz, mając wcześniej dokładnie 1 punkt do końca."),
  A(15, "short", "🎂", "Czterdzieści na liczniku", "Zdobądź dokładnie 40 punktów w kolejce."),
  A(16, "short", "🕶️", "Pięćdziesiąt twarzy darta", "Zdobądź dokładnie 50 punktów w kolejce."),
  A(17, "short", "⏱️", "Sześćdziesiąt sekund chwały", "Zdobądź dokładnie 60 punktów w kolejce."),
  A(18, "short", "💥", "A miało być tak pięknie", "Przekrocz wynik już pierwszą rzutką kolejki.", true),
  A(19, "short", "🤯", "Matematyka mnie pokonała", "Przekrocz wynik 3 razy w jednym meczu."),
  A(20, "short", "🙈", "Ślepak", "Przekrocz wynik 5 razy w jednym meczu."),
  A(21, "short", "🛟", "Ostatnia deska ratunku", "Wygraj mecz ostatnią, trzecią rzutką kolejki.", true),
  A(22, "short", "⚡", "Szybka robota", "Wygraj mecz w maksymalnie 3 kolejkach."),
  A(23, "short", "🚄", "Ekspres do Radomia", "Wygraj mecz w maksymalnie 6 rzutkach.", true),
  A(24, "short", "🐂", "Cud nad tarczą", "Traf bullseye za 50 punktów.", true),
  A(25, "short", "🟢", "Prawie w punkt", "Traf outer bull za 25 punktów.", true),
  A(26, "short", "🐌", "Ślimak", "Zdobądź dokładnie 1 punkt w kolejce."),
  A(27, "short", "🧱", "Ani jednej w ścianę", "Każda Twoja rzutka w meczu zdobywa punkty (do samego końca).", true),
  A(28, "short", "👏", "Dwie ręce do oklasków", "Traf 2 pola double w jednej kolejce.", true),
  A(29, "short", "☕", "Potrójne espresso", "Traf 2 pola triple w jednej kolejce.", true),
  A(30, "short", "🚜", "Demolka", "Wygraj mecz, gdy każdemu rywalowi zostało co najmniej 80 punktów."),
  A(31, "short", "🪂", "Uratowany w ostatniej chwili", "Wygraj mecz po wcześniejszym przekroczeniu w tej samej grze."),

  A(32, "special", "🕴️", "Leon Zawodowiec", "Zakończ mecz trafieniem double.", true),
  A(33, "special", "🥊", "Potrójny nokaut", "Zakończ mecz trafieniem triple.", true),
  A(34, "special", "🐃", "Byk", "Zakończ mecz trafieniem bullseye (50).", true),
  A(35, "special", "🩺", "Chirurg", "Traf 3 razy dokładnie to samo pole w jednej kolejce.", true),
  A(36, "special", "🎩", "Hat-trick", "Traf 3 pojedyncze 20 w jednej kolejce.", true),
  A(37, "special", "🏹", "Robin Hood", "Traf 3 pojedyncze 19 w jednej kolejce.", true),
  A(38, "special", "🔱", "Trójca święta", "Traf 3 różne pola triple w jednej kolejce.", true),
  A(39, "special", "🕵️", "Podwójny agent", "Traf 3 różne pola double w jednej kolejce.", true),
  A(40, "special", "📐", "Geometra", "Traf pojedyncze 1, 5 i 20 w jednej kolejce.", true),
  A(41, "special", "⚖️", "Złoty środek", "Traf outer bull i bullseye w jednej kolejce.", true),
  A(42, "special", "🎖️", "Snajper wyborowy", "Traf 3 pola triple w jednym meczu.", true),
  A(43, "special", "🧟", "Powrót z zaświatów", "Wygraj mecz, gdy wcześniej rywalowi zostało najwyżej 10 punktów, a Tobie co najmniej 50."),
  A(44, "special", "🌈", "Wieczny optymista", "Przegraj 10 meczów z rzędu."),
  A(45, "special", "🎓", "Wykończenie z klasą", "Zakończ mecz trafieniem D20.", true),
  A(46, "special", "🤷", "Nie pytaj, jak to zrobiłem", "Zakończ mecz trafieniem T1.", true),
  A(47, "special", "🎲", "Trzy razy szczęście", "Traf 3 różne pojedyncze pola w jednej kolejce.", true),
  A(48, "special", "🎆", "Wielki finał", "Zakończ mecz, zdobywając co najmniej 60 punktów w ostatniej kolejce."),
  A(49, "special", "💯", "Chłopak na 100", "Zdobądź co najmniej 100 punktów w jednej kolejce."),

  A(50, "long", "📋", "Stażysta", "Rozegraj 10 meczów."),
  A(51, "long", "📝", "Umowa na czas określony", "Rozegraj 25 meczów."),
  A(52, "long", "🖋️", "Umowa na czas nieokreślony", "Rozegraj 50 meczów."),
  A(53, "long", "🏖️", "Emerytura przy tarczy", "Rozegraj 100 meczów."),
  A(54, "long", "💵", "Pierwsza premia", "Wygraj 10 meczów."),
  A(55, "long", "🧑‍💼", "Awans na specjalistę", "Wygraj 25 meczów."),
  A(56, "long", "🗂️", "Kierownik działu lotek", "Wygraj 50 meczów."),
  A(57, "long", "🏢", "Dyrektor generalny", "Wygraj 75 meczów."),
  A(58, "long", "👔", "Prezes wszystkich prezesów", "Wygraj 100 meczów."),
  A(59, "long", "🍻", "Piątek, piąteczek, piątunio", "Zagraj mecz w 5 różnych piątków."),
  A(60, "long", "📅", "Etatowy zawodnik", "Graj co najmniej raz w tygodniu przez 4 kolejne tygodnie."),
  A(61, "long", "🏜️", "Biednemu zawsze piach w oczy", "Zajmij ostatnie miejsce w 20 meczach."),
  A(62, "long", "🥋", "Mój ulubiony worek treningowy", "Wygraj 25 meczów, w których grał ten sam rywal."),
  A(63, "long", "⚙️", "Maszyna do punktów", "Zdobądź łącznie 5 000 punktów."),
  A(64, "long", "🏭", "Fabryka punktów", "Zdobądź łącznie 25 000 punktów."),
  A(65, "long", "🎴", "Kolekcjoner dubli", "Traf łącznie 50 pól double.", true),
  A(66, "long", "🃏", "Kolekcjoner tripli", "Traf łącznie 50 pól triple.", true),
  A(67, "long", "🐮", "Byczy kolekcjoner", "Traf łącznie 25 razy bullseye za 50 punktów.", true),

  A(68, "legend", "📜", "Trzy lotki do historii", "Wygraj mecz do 101 dokładnie 3 rzutkami.", true),
  A(69, "legend", "🚨", "Czy to jest legalne?!", "Wygraj mecz do 101 dokładnie 2 rzutkami.", true),
  A(70, "legend", "💎", "Perfekcyjna setka", "Zdobądź dokładnie 100 punktów w kolejce i zostaw sobie 1 punkt."),
  A(71, "legend", "🏛️", "Dartowa legenda", "Zdobądź łącznie 50 000 punktów."),
  A(72, "legend", "👑", "Żywa legenda", "Wygraj 5 meczów z rzędu."),
  A(73, "legend", "🗿", "Legendarny uczestnik", "Rozegraj 200 meczów."),
  A(74, "legend", "🌍", "Trzy strzały, trzy światy", "Traf single, double i triple w jednej kolejce.", true),
  A(75, "legend", "💣", "Destroyer", "Wszystkie 3 rzutki kolejki w outer bull albo bullseye.", true),
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Postęp gracza: zdobyte osiągnięcia i liczniki potrzebne do kolejnych. */
export interface AchProgress {
  /** Zdobyte: kiedy (ms) i w której grze. */
  unlocked: Record<number, { at: number; gameId: string }>;
  games: number;
  wins: number;
  /** Zdobyte punkty (bez przekroczeń). */
  points: number;
  doubles: number;
  triples: number;
  bulls: number;
  /** Trafione pola tarczy (bez pudła), np. ["T20", "5", "D25"]. */
  fields: string[];
  /** Piątki, w które grał (data w Polsce, RRRR-MM-DD). */
  fridays: string[];
  /** Tygodnie (pon–niedz), w które grał: numer tygodnia od 1970. */
  weeks: number[];
  lastPlaces: number;
  /** Wygrane w grach z danym rywalem. */
  winsVs: Record<string, number>;
  winStreak: number;
  lossStreak: number;
}

export function emptyProgress(): AchProgress {
  return {
    unlocked: {},
    games: 0,
    wins: 0,
    points: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    fields: [],
    fridays: [],
    weeks: [],
    lastPlaces: 0,
    winsVs: {},
    winStreak: 0,
    lossStreak: 0,
  };
}

/** Gra do policzenia osiągnięć: zapisana albo właśnie trwająca. */
export interface AchGame {
  id: string;
  target: number;
  /** Wszyscy gracze gry. */
  players: string[];
  turns: Turn[];
  /** Kiedy grano (ms) – do piątków i tygodni. */
  at: number;
  /** Miejsca na koniec gry; brak = gra jeszcze trwa (liczniki gier czekają na koniec). */
  places?: Record<string, number>;
}

/** Wszystkie pola tarczy: 1–20 pojedyncze, double i triple oraz 25 i bull. */
export const ALL_FIELDS = 62;

const isDouble = (f: string) => /^D([1-9]|1\d|20)$/.test(f);
const isTriple = (f: string) => /^T\d+$/.test(f);
const isSingle = (f: string) => /^([1-9]|1\d|20)$/.test(f);
const isBullish = (f: string) => f === "25" || f === "D25";
const numberOf = (f: string) => f.replace(/^[DT]/, "");

/** Data w Polsce: dzień tygodnia i dzień od 1970. */
const WARSAW = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

function warsawDay(ms: number): { date: string; day: number; friday: boolean } {
  const parts = Object.fromEntries(WARSAW.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const day = Math.round(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000);
  return { date, day, friday: parts.weekday === "Fri" };
}

/** Najdłuższy ciąg kolejnych tygodni. */
export function longestWeekRun(weeks: number[]): number {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

const clone = (p: AchProgress): AchProgress => ({
  ...p,
  unlocked: { ...p.unlocked },
  fields: [...p.fields],
  fridays: [...p.fridays],
  weeks: [...p.weeks],
  winsVs: { ...p.winsVs },
});

/**
 * Dokłada jedną grę do postępu gracza i zwraca nowy postęp (bez mutacji).
 * Gra może jeszcze trwać – wtedy liczą się serie i zakończenia,
 * a liczniki gier, wygranych i serii zwycięstw dopiero, gdy są `places`.
 */
export function addGame(prev: AchProgress, memberId: string, game: AchGame): AchProgress {
  if (game.players.length < 2 || !game.players.includes(memberId)) return prev;
  const p = clone(prev);
  const unlock = (id: number, at: number = game.at) => {
    if (!p.unlocked[id]) p.unlocked[id] = { at, gameId: game.id };
  };

  const scored = new Map(game.players.map((id) => [id, 0]));
  const left = (id: string) => game.target - (scored.get(id) ?? 0);
  const fieldSet = new Set(p.fields);
  let finishers = 0;
  let busts = 0;
  let hadBust = false;
  let triplesInGame = 0;
  let myTurns = 0;
  let myDarts = 0;
  let allDartsKnown = true;
  let everyDartScored = true;
  let comeback = false;

  for (const t of game.turns) {
    const mine = t.playerId === memberId;
    const before = left(t.playerId);
    const at = t.at ?? game.at;
    if (mine) {
      myTurns++;
      if (t.darts) myDarts += t.darts.length;
      else {
        allDartsKnown = false;
        myDarts += 3;
      }
      if (!t.darts || t.darts.some((d) => d <= 0)) everyDartScored = false;
      const f = t.fields ?? [];

      // Punkty serii.
      if (t.bust) {
        busts++;
        hadBust = true;
        if (busts >= 3) unlock(19, at);
        if (busts >= 5) unlock(20, at);
        if (t.darts && t.darts[0] > before) unlock(18, at);
      } else {
        p.points += t.scored;
        if (t.scored === 0 && (t.darts?.length ?? 3) === 3) unlock(2, at);
        if (t.scored === 1) unlock(26, at);
        if (t.scored === 40) unlock(15, at);
        if (t.scored === 50) unlock(16, at);
        if (t.scored === 60) unlock(17, at);
        if (t.scored >= 100) unlock(49, at);
        if (t.scored === 100 && before - t.scored === 1) unlock(70, at);
      }

      // Trafione pola (tryb rzutek).
      const doubles = f.filter(isDouble);
      const triples = f.filter(isTriple);
      const singles = f.filter(isSingle);
      for (const x of f) if (x !== "0") fieldSet.add(x);
      p.doubles += doubles.length;
      p.triples += triples.length;
      p.bulls += f.filter((x) => x === "D25").length;
      triplesInGame += triples.length;
      if (f.some((x) => numberOf(x) === "1")) unlock(1, at);
      if (f.some((x) => x !== "0" && fieldValueOf(x) >= 20)) unlock(5, at);
      if (doubles.length) unlock(7, at);
      if (triples.length) unlock(8, at);
      if (f.includes("20")) unlock(12, at);
      if (f.includes("D25")) unlock(24, at);
      if (f.includes("25")) unlock(25, at);
      if (doubles.length >= 2) unlock(28, at);
      if (triples.length >= 2) unlock(29, at);
      if (triplesInGame >= 3) unlock(42, at);
      if (f.length === 3) {
        if (f.every((x) => numberOf(x) === "20")) unlock(13, at);
        if (f[0] !== "0" && f.every((x) => x === f[0])) unlock(35, at);
        if (f.every((x) => x === "20")) unlock(36, at);
        if (f.every((x) => x === "19")) unlock(37, at);
        if (new Set(triples).size === 3) unlock(38, at);
        if (new Set(doubles).size === 3) unlock(39, at);
        if ([...f].sort().join() === "1,20,5") unlock(40, at);
        if (singles.length === 3 && new Set(singles).size === 3) unlock(47, at);
        if (f.every(isBullish)) unlock(75, at);
      }
      if (f.includes("25") && f.includes("D25")) unlock(41, at);
      if (singles.length && doubles.length && triples.length) unlock(74, at);

      // Liczniki z całej historii.
      if (fieldSet.size >= ALL_FIELDS) unlock(11, at);
      if (p.points >= 5000) unlock(63, at);
      if (p.points >= 25000) unlock(64, at);
      if (p.points >= 50000) unlock(71, at);
      if (p.doubles >= 50) unlock(65, at);
      if (p.triples >= 50) unlock(66, at);
      if (p.bulls >= 25) unlock(67, at);
    }

    if (!t.bust) scored.set(t.playerId, (scored.get(t.playerId) ?? 0) + t.scored);
    const done = !t.bust && left(t.playerId) === 0;
    if (done) finishers++;

    if (mine && done) {
      // Zakończenie gracza (zejście do 0).
      const last = t.fields?.at(-1);
      unlock(9, at);
      if (t.scored >= 60) unlock(48, at);
      if (last && isDouble(last)) unlock(32, at);
      if (last && isTriple(last)) unlock(33, at);
      if (last === "D25") unlock(34, at);
      if (last === "D20") unlock(45, at);
      if (last === "T1") unlock(46, at);
      if (everyDartScored) unlock(27, at);
      if (finishers === 1) {
        // Wygrana: pierwszy, który zszedł do 0.
        unlock(3, at);
        if (before === 1) unlock(14, at);
        if (t.darts?.length === 3) unlock(21, at);
        if (myTurns <= 3) unlock(22, at);
        if (myTurns <= 2 || (allDartsKnown && myDarts <= 6)) unlock(23, at);
        if (game.players.every((id) => id === memberId || left(id) >= 80)) unlock(30, at);
        if (hadBust) unlock(31, at);
        if (comeback) unlock(43, at);
        if (game.target === 101 && allDartsKnown && myDarts === 3) unlock(68, at);
        if (game.target === 101 && allDartsKnown && myDarts === 2) unlock(69, at);
      }
    }

    // Powrót z zaświatów: rywal o krok od mety, a mnie zostało dużo.
    if (finishers === 0 && left(memberId) >= 50) {
      if (game.players.some((id) => id !== memberId && left(id) >= 1 && left(id) <= 10)) comeback = true;
    }
  }
  p.fields = [...fieldSet];

  // Koniec gry: liczniki meczów.
  const place = game.places?.[memberId];
  if (place !== undefined) {
    p.games++;
    if (place === 1) {
      p.wins++;
      p.winStreak++;
      p.lossStreak = 0;
      for (const id of game.players) if (id !== memberId) p.winsVs[id] = (p.winsVs[id] ?? 0) + 1;
    } else {
      p.lossStreak++;
      p.winStreak = 0;
      unlock(4);
    }
    if (place === game.players.length) p.lastPlaces++;
    const day = warsawDay(game.at);
    if (day.friday && !p.fridays.includes(day.date)) p.fridays.push(day.date);
    const week = Math.floor((day.day + 3) / 7); // 1970-01-01 to czwartek; tydzień od poniedziałku
    if (!p.weeks.includes(week)) p.weeks.push(week);

    if (p.games >= 5) unlock(6);
    if (p.games >= 10) unlock(50);
    if (p.games >= 25) unlock(51);
    if (p.games >= 50) unlock(52);
    if (p.games >= 100) unlock(53);
    if (p.games >= 200) unlock(73);
    if (p.wins >= 10) unlock(54);
    if (p.wins >= 25) unlock(55);
    if (p.wins >= 50) unlock(56);
    if (p.wins >= 75) unlock(57);
    if (p.wins >= 100) unlock(58);
    if (p.winStreak >= 2) unlock(10);
    if (p.winStreak >= 5) unlock(72);
    if (p.lossStreak >= 10) unlock(44);
    if (p.fridays.length >= 5) unlock(59);
    if (longestWeekRun(p.weeks) >= 4) unlock(60);
    if (p.lastPlaces >= 20) unlock(61);
    if (Object.values(p.winsVs).some((n) => n >= 25)) unlock(62);
  }
  return p;
}

function fieldValueOf(f: string): number {
  const m = /^([DT]?)(\d+)$/.exec(f);
  if (!m) return 0;
  return Number(m[2]) * (m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1);
}

/** Postęp wszystkich graczy z gier ułożonych od najstarszej. */
export function computeProgress(games: AchGame[]): Record<string, AchProgress> {
  const out: Record<string, AchProgress> = {};
  for (const g of games) {
    for (const id of g.players) out[id] = addGame(out[id] ?? emptyProgress(), id, g);
  }
  return out;
}

/** Osiągnięcia zdobyte w `after`, których nie było w `before` (w kolejności zdobycia). */
export function newlyUnlocked(before: AchProgress | undefined, after: AchProgress): Achievement[] {
  return Object.entries(after.unlocked)
    .filter(([id]) => !before?.unlocked[Number(id)])
    .sort((a, b) => a[1].at - b[1].at || Number(a[0]) - Number(b[0]))
    .map(([id]) => ACHIEVEMENT_BY_ID.get(Number(id))!)
    .filter(Boolean);
}

/** Postęp do osiągnięcia z licznikiem (np. 9 z 10 meczów); null dla jednorazowych. */
export function progressOf(p: AchProgress, id: number): { value: number; goal: number; unit: string } | null {
  const games = (goal: number) => ({ value: p.games, goal, unit: "meczów" });
  const wins = (goal: number) => ({ value: p.wins, goal, unit: "wygranych" });
  const points = (goal: number) => ({ value: p.points, goal, unit: "pkt" });
  const make = (): { value: number; goal: number; unit: string } | null => {
    switch (id) {
      case 6: return games(5);
      case 50: return games(10);
      case 51: return games(25);
      case 52: return games(50);
      case 53: return games(100);
      case 73: return games(200);
      case 54: return wins(10);
      case 55: return wins(25);
      case 56: return wins(50);
      case 57: return wins(75);
      case 58: return wins(100);
      case 63: return points(5000);
      case 64: return points(25000);
      case 71: return points(50000);
      case 65: return { value: p.doubles, goal: 50, unit: "double" };
      case 66: return { value: p.triples, goal: 50, unit: "triple" };
      case 67: return { value: p.bulls, goal: 25, unit: "bullseye" };
      case 11: return { value: p.fields.length, goal: ALL_FIELDS, unit: "pól" };
      case 59: return { value: p.fridays.length, goal: 5, unit: "piątków" };
      case 60: return { value: longestWeekRun(p.weeks), goal: 4, unit: "tygodni" };
      case 61: return { value: p.lastPlaces, goal: 20, unit: "ostatnich miejsc" };
      case 62: return { value: Math.max(0, ...Object.values(p.winsVs)), goal: 25, unit: "wygranych z jednym rywalem" };
      case 10: return { value: p.winStreak, goal: 2, unit: "wygranych z rzędu" };
      case 72: return { value: p.winStreak, goal: 5, unit: "wygranych z rzędu" };
      case 44: return { value: p.lossStreak, goal: 10, unit: "przegranych z rzędu" };
      default: return null;
    }
  };
  const r = make();
  return r ? { ...r, value: Math.min(r.value, r.goal) } : null;
}
