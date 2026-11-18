import { describe, expect, it } from "vitest";
import {
  applyTurn,
  canEndEarly,
  endGame,
  createGame,
  currentPlayer,
  finishOrder,
  isGameOver,
  isGameState,
  isValidDart,
  lastTurnOf,
  placeOf,
  playerStats,
  rematch,
  remainingFor,
  standings,
  undoLastTurn,
} from "./engine";
import type { GameState } from "./types";

const players = [
  { id: "a", name: "Ania" },
  { id: "b", name: "Bartek" },
  { id: "c", name: "Celina" },
];

const play = (g: GameState, ...scores: number[]) => scores.reduce((s, x) => applyTurn(s, x), g);

describe("podstawy", () => {
  it("pokazuje ile zostało i zmienia kolejkę", () => {
    let g = createGame(players, 101);
    expect(remainingFor(g, "a")).toBe(101);
    g = applyTurn(g, 60);
    expect(remainingFor(g, "a")).toBe(41);
    expect(currentPlayer(g)?.id).toBe("b");
  });

  it("przekroczenie celu = seria się nie liczy", () => {
    const g = play(createGame(players, 101), 90, 10, 10, 20); // a: 11 zostało, potem 20
    expect(g.turns.at(-1)?.bust).toBe(true);
    expect(remainingFor(g, "a")).toBe(11);
    expect(finishOrder(g)).toEqual([]);
  });

  it("odrzuca niepoprawne wyniki serii", () => {
    const g = createGame(players, 101);
    expect(() => applyTurn(g, 181)).toThrow();
    expect(() => applyTurn(g, -1)).toThrow();
    expect(() => applyTurn(g, 2.5)).toThrow();
  });
});

describe("gra do ostatniego miejsca", () => {
  it("po trafieniu celu gracz kończy, a reszta gra dalej bez niego", () => {
    let g = play(createGame(players, 101), 101); // Ania kończy od razu
    expect(placeOf(g, "a")).toBe(1);
    expect(isGameOver(g)).toBe(false);
    expect(currentPlayer(g)?.id).toBe("b");
    g = play(g, 10, 20); // Bartek, Celina
    expect(currentPlayer(g)?.id).toBe("b"); // Ania pominięta
  });

  it("kończy się, gdy został jeden gracz, i daje pełną klasyfikację", () => {
    // a:100, b:50, c:101 (kończy 1.), a:1 (kończy 2.) → zostaje Bartek
    const g = play(createGame(players, 101), 100, 50, 101, 1);
    expect(finishOrder(g)).toEqual(["c", "a"]);
    expect(isGameOver(g)).toBe(true);
    expect(currentPlayer(g)).toBeNull();
    expect(() => applyTurn(g, 5)).toThrow();
    expect(standings(g).map((s) => [s.player.id, s.place, s.finished])).toEqual([
      ["c", 1, true],
      ["a", 2, true],
      ["b", 3, false],
    ]);
    expect(standings(g)[2].remaining).toBe(51);
  });

  it("gra solo kończy się po trafieniu celu", () => {
    const g = play(createGame([players[0]], 101), 60, 41);
    expect(isGameOver(g)).toBe(true);
    expect(standings(g)[0].place).toBe(1);
  });

  it("cofnięcie serii kończącej przywraca gracza do gry", () => {
    let g = play(createGame(players, 101), 100, 50, 101, 1);
    g = undoLastTurn(g);
    expect(isGameOver(g)).toBe(false);
    expect(finishOrder(g)).toEqual(["c"]);
    expect(currentPlayer(g)?.id).toBe("a");
  });

  it("kolejka po ukończeniu ostatniego w rzędzie wraca na początek", () => {
    const g = play(createGame(players, 101), 10, 10, 101); // Celina kończy
    expect(currentPlayer(g)?.id).toBe("a");
  });
});

describe("zakończ grę", () => {
  it("po pierwszym zwycięzcy kończy grę, reszta według punktów; cofnięcie wraca do gry", () => {
    let g = play(createGame(players, 101), 101, 30, 60); // Ania kończy, Bartek 71, Celina 41
    expect(canEndEarly(createGame(players, 101))).toBe(false);
    expect(canEndEarly(g)).toBe(true);
    g = endGame(g);
    expect(isGameOver(g)).toBe(true);
    expect(standings(g).map((s) => [s.player.id, s.place])).toEqual([
      ["a", 1],
      ["c", 2],
      ["b", 3],
    ]);
    expect(() => endGame(g)).toThrow();
    g = undoLastTurn(g);
    expect(isGameOver(g)).toBe(false);
    expect(g.turns).toHaveLength(3);
  });
});

describe("rzutka po rzutce", () => {
  it("zapisuje rzutki, sprawdza sumę i wartości", () => {
    const g = applyTurn(createGame(players, 101), 85, [20, 60, 5]);
    expect(g.turns[0]).toMatchObject({ scored: 85, darts: [20, 60, 5], bust: false });
    expect(() => applyTurn(createGame(players, 101), 80, [20, 60, 5])).toThrow();
    expect(() => applyTurn(createGame(players, 101), 23, [23])).toThrow();
    expect(() => applyTurn(createGame(players, 101), 4, [1, 1, 1, 1])).toThrow();
  });

  it("przekroczenie liczone po sumie, także gdy seria kończy się wcześniej", () => {
    const g = applyTurn(createGame(players, 101), 120, [60, 60]);
    expect(g.turns[0].bust).toBe(true);
  });

  it("isValidDart: pola, podwójne, potrójne i środek", () => {
    expect([0, 1, 20, 22, 25, 39, 40, 50, 57, 60].map(isValidDart)).toEqual([
      true, true, true, true, true, true, true, true, true, true,
    ]);
    expect([23, 43, 41, 59, 61, -1, 2.5].map(isValidDart).some(Boolean)).toBe(false);
  });
});

describe("pomocnicze", () => {
  it("lastTurnOf i rematch", () => {
    const g = play(createGame(players, 101), 40, 7);
    expect(lastTurnOf(g, "a")?.scored).toBe(40);
    expect(lastTurnOf(g, "c")).toBeNull();
    const r = rematch(g);
    expect(r.turns).toHaveLength(0);
    expect(r.players).toEqual(players);
  });

  it("odrzuca zapis w starym formacie", () => {
    expect(isGameState(createGame(players))).toBe(true);
    expect(isGameState({ ...createGame(players), winnerId: null })).toBe(false);
    expect(isGameState(null)).toBe(false);
  });
});

describe("statystyki gracza", () => {
  it("średnia na serię liczy też przekroczenia jako serię za 0", () => {
    // Ania: 60, 50 (przekroczenie: 110 > 101), 41 → 101
    const g = play(createGame(players.slice(0, 2), 101), 60, 10, 50, 10, 41);
    expect(playerStats(g, "a")).toEqual({ series: 3, points: 101, average: 101 / 3, best: 60, busts: 1 });
    expect(playerStats(g, "b")).toMatchObject({ series: 2, points: 20, best: 10, busts: 0 });
    expect(playerStats(createGame(players, 101), "c").average).toBe(0);
  });
});
