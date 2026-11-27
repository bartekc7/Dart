/**
 * Model rozgrywki. Celowo bez zależności od Reacta i bazy danych,
 * żeby ten sam kod działał w przeglądarce (krok 2), na serwerze
 * przy zapisie do Postgresa (krok 3) i przy podglądzie na żywo (krok 4).
 */

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
}

export interface GameSettings {
  /** Liczba punktów do zdobycia „do równego”, np. 101. */
  target: number;
  /**
   * Wyrównana runda (1 na 1): gdy ktoś skończy, runda gra się do końca –
   * gracze po nim w kolejce rzucają jeszcze swoją serię. Gra kończy się
   * z końcem tej rundy; kto skończył w niej, wygrywa (kilku = remis).
   * Brak = jak dotąd: gra kończy się, gdy został jeden gracz.
   */
  evenRounds?: boolean;
}

export interface Turn {
  playerId: PlayerId;
  /** Suma punktów wpisana za serię (0–180). */
  scored: number;
  /** true, gdy seria przekroczyła cel i się nie liczy. */
  bust: boolean;
  /**
   * Punkty z kolejnych rzutek (1–3), gdy wpisywano każdą osobno.
   * Brak = wpisano tylko sumę serii.
   */
  darts?: number[];
  /**
   * Pola trafione kolejnymi rzutkami, np. ["T20", "5", "D25"] („0” = pudło).
   * Zapisywane od wprowadzenia tarczy trafień; starsze serie ich nie mają.
   */
  fields?: string[];
  /**
   * Kiedy seria została zapisana (ms od 1970, zegar telefonu liczącego).
   * Ostatnia seria gracza, który skończył, to jego czas zakończenia.
   * Starsze gry tego nie mają.
   */
  at?: number;
}

export interface GameState {
  /** Identyfikator gry (do historii). */
  id?: string;
  settings: GameSettings;
  /** Gracze w kolejności rzucania. */
  players: Player[];
  /**
   * Wszystkie serie po kolei. Kolejność miejsc i to, kto rzuca,
   * wyliczamy z tej listy, więc cofnięcie serii zawsze jest spójne.
   */
  turns: Turn[];
  /**
   * Gra zakończona przyciskiem „Zakończ grę”, zanim wszyscy skończyli.
   * Pozostali dostają miejsca według tego, ile im zostało.
   */
  endedEarly?: boolean;
  /** Pierwsza rzutka gry (ms od 1970). Czas gry liczymy od niej do ostatniej serii. */
  startedAt?: number;
}

export interface Placement {
  player: Player;
  /** 1 = pierwsze miejsce. */
  place: number;
  /** Ile serii rzucił. */
  rounds: number;
  /** Ile zostało (0 dla tych, którzy trafili równo). */
  remaining: number;
  /** true, gdy trafił równo w cel. */
  finished: boolean;
}

/** Jak wpisywać serię: sama suma (domyślnie) albo każda z trzech rzutek osobno. */
export type EntryMode = "sum" | "darts";
