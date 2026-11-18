import { describe, expect, it } from "vitest";
import {
  applyTurn,
  createGame,
  currentPlayer,
  remainingFor,
  undoLastTurn,
} from "./engine";

const players = [
  { id: "a", name: "Ania" },
  { id: "b", name: "Bartek" },
];

describe("silnik gry do równego", () => {
  it("pokazuje ile zostało i zmienia kolejkę", () => {
    let g = createGame(players, 101);
    expect(remainingFor(g, "a")).toBe(101);
    g = applyTurn(g, 60);
    expect(remainingFor(g, "a")).toBe(41);
    expect(currentPlayer(g)?.id).toBe("b");
  });

  it("przekroczenie celu = seria się nie liczy", () => {
    let g = createGame(players, 101);
    g = applyTurn(g, 90); // a: zostało 11
    g = applyTurn(g, 10); // b
    g = applyTurn(g, 20); // a: przekroczenie
    expect(g.turns.at(-1)?.bust).toBe(true);
    expect(remainingFor(g, "a")).toBe(11);
    expect(g.winnerId).toBeNull();
  });

  it("trafienie równo w cel kończy grę", () => {
    let g = createGame(players, 101);
    g = applyTurn(g, 100);
    g = applyTurn(g, 0);
    g = applyTurn(g, 1);
    expect(g.winnerId).toBe("a");
    expect(currentPlayer(g)).toBeNull();
    expect(() => applyTurn(g, 5)).toThrow();
  });

  it("cofnięcie serii przywraca stan", () => {
    let g = createGame(players, 101);
    g = applyTurn(g, 101);
    g = undoLastTurn(g);
    expect(g.winnerId).toBeNull();
    expect(currentPlayer(g)?.id).toBe("a");
  });

  it("odrzuca niepoprawne wyniki serii", () => {
    const g = createGame(players, 101);
    expect(() => applyTurn(g, 181)).toThrow();
    expect(() => applyTurn(g, -1)).toThrow();
    expect(() => applyTurn(g, 2.5)).toThrow();
  });
});
