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
}

export interface GameState {
  settings: GameSettings;
  /** Gracze w kolejności rzucania. */
  players: Player[];
  turns: Turn[];
  winnerId: PlayerId | null;
}
