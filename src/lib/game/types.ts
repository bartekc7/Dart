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
