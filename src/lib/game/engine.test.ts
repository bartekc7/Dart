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
  dartName,
  dartValue,
  fieldValue,
  isValidDart,
  lastTurnOf,
  placeOf,
  playerStats,
  rematch,
  remainingFor,
  standings,
  undoLastTurn,
  checkout,
  finishedAt,
  finishTime,
  formatDuration,
  gameDuration,
  gameStart,
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
    expect(g.turns[0]).toMatchObject({
      scored: 85,
      darts: [20, 60, 5],
      bust: false,
    });
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
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
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
    // Zaczyna kolejny gracz; po pełnym obrocie wraca pierwotna kolejność.
    expect(r.players.map((p) => p.id)).toEqual([...players.slice(1), players[0]].map((p) => p.id));
    let back = g;
    for (let i = 0; i < players.length; i++) back = rematch(back);
    expect(back.players).toEqual(players);
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
    expect(playerStats(g, "a")).toEqual({
      series: 3,
      points: 101,
      average: 101 / 3,
      best: 60,
      busts: 1,
    });
    expect(playerStats(g, "b")).toMatchObject({
      series: 2,
      points: 20,
      best: 10,
      busts: 0,
    });
    expect(playerStats(createGame(players, 101), "c").average).toBe(0);
  });
});

describe("Double i Triple", () => {
  it("dartValue liczy punkty pola z mnożnikiem", () => {
    expect(dartValue(20, 1)).toBe(20);
    expect(dartValue(20, 2)).toBe(40);
    expect(dartValue(20, 3)).toBe(60);
    expect(dartValue(25, 2)).toBe(50);
    expect([dartValue(25, 3), dartValue(21, 2), dartValue(0, 3), dartValue(23, 1)]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(dartValue(0, 1)).toBe(0);
  });

  it("dartName podpowiada zapis rzutu kończącego", () => {
    expect([16, 25, 50, 40, 22, 57, 60, 39].map(dartName)).toEqual([
      "16",
      "25",
      "D25",
      "D20",
      "D11",
      "T19",
      "T20",
      "T13",
    ]);
  });
});

describe("pola rzutek", () => {
  it("fieldValue czyta zapis pola", () => {
    expect(["T20", "D8", "5", "25", "D25", "0"].map(fieldValue)).toEqual([60, 16, 5, 25, 50, 0]);
    expect(["T25", "D21", "21", "X3", "", "50"].map(fieldValue)).toEqual([null, null, null, null, null, null]);
  });

  it("applyTurn zapisuje pola tylko, gdy zgadzają się z rzutkami", () => {
    const g = createGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], 101);
    expect(applyTurn(g, 81, [60, 16, 5], ["T20", "D8", "5"]).turns[0].fields).toEqual(["T20", "D8", "5"]);
    expect(applyTurn(g, 81, [60, 16, 5], ["T20", "8", "5"]).turns[0].fields).toBeUndefined();
    expect(applyTurn(g, 81, [60, 16, 5]).turns[0].fields).toBeUndefined();
  });
});

describe("podpowiedź zakończenia", () => {
  it("jedną rzutką, gdy się da", () => {
    expect(checkout(20)).toEqual(["20"]);
    expect(checkout(60)).toEqual(["T20"]);
    expect(checkout(40)).toEqual(["D20"]);
    expect(checkout(50)).toEqual(["D25"]);
  });

  it("najmniej rzutek, najwyższe pole najpierw", () => {
    expect(checkout(100)).toEqual(["T20", "D20"]);
    expect(checkout(37)).toEqual(["20", "17"]);
    expect(checkout(180)).toEqual(["T20", "T20", "T20"]);
    expect(checkout(101)?.length).toBe(2);
  });

  it("każda podpowiedź sumuje się do reszty i mieści w rzutkach", () => {
    for (let darts = 1; darts <= 3; darts++) {
      for (let left = 1; left <= 180; left++) {
        const c = checkout(left, darts);
        if (!c) continue;
        expect(c.length).toBeLessThanOrEqual(darts);
        expect(c.reduce((s, f) => s + fieldValue(f)!, 0)).toBe(left);
      }
    }
  });

  it("brak podpowiedzi, gdy się nie da", () => {
    expect(checkout(0)).toBeNull();
    expect(checkout(181)).toBeNull();
    expect(checkout(61, 1)).toBeNull();
    expect(checkout(179)).toBeNull(); // 179 nie da się trzema rzutkami
    expect(checkout(5, 0)).toBeNull();
  });
});

describe("czas gry", () => {
  const two = [players[0], players[1]];

  it("liczy od pierwszej rzutki do ostatniej serii i zapisuje czas zakończenia gracza", () => {
    let g = createGame(players, 101);
    g = applyTurn(g, 60, undefined, undefined, { at: 10_000, startedAt: 4_000 });
    expect(g.startedAt).toBe(4_000);
    g = applyTurn(g, 50, undefined, undefined, { at: 20_000 });
    g = applyTurn(g, 10, undefined, undefined, { at: 25_000 });
    g = applyTurn(g, 41, undefined, undefined, { at: 30_000 }); // Ania kończy
    expect(finishedAt(g, "a")).toBe(30_000);
    expect(finishTime(g, "a")).toBe(26_000);
    expect(finishedAt(g, "b")).toBeNull();
    g = applyTurn(g, 51, undefined, undefined, { at: 95_000 }); // Bartek kończy, koniec gry
    expect(isGameOver(g)).toBe(true);
    expect(gameDuration(g)).toBe(91_000);
    expect(g.startedAt).toBe(4_000); // późniejsze serie nie zmieniają początku
  });

  it("bez pierwszej rzutki początkiem jest pierwsza seria; cofnięcie wszystkiego czyści początek", () => {
    let g = applyTurn(createGame(two, 101), 20, undefined, undefined, { at: 7_000 });
    expect(gameStart(g)).toBe(7_000);
    g = undoLastTurn(g);
    expect(g.startedAt).toBeUndefined();
    // Pierwsza rzutka „po” zapisie serii to błąd zegara – bierzemy czas serii.
    g = applyTurn(g, 20, undefined, undefined, { at: 7_000, startedAt: 9_000 });
    expect(g.startedAt).toBe(7_000);
  });

  it("stare gry bez czasów nie mają czasu gry", () => {
    let g = applyTurn(createGame(players, 101), 101, undefined, undefined, { at: null });
    g = applyTurn(g, 20, undefined, undefined, { at: null });
    expect(g.turns.every((t) => t.at === undefined)).toBe(true);
    expect(gameDuration(g)).toBeNull();
    expect(finishTime(g, "a")).toBeNull();
  });

  it("formatuje czas jak zegar", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
    expect(formatDuration(754_000)).toBe("12:34");
    expect(formatDuration(3_909_000)).toBe("1:05:09");
    expect(formatDuration(-5)).toBe("0:00");
  });
});
