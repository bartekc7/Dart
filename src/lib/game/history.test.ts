import { describe, expect, it } from "vitest";
import { applyTurn, createGame } from "./engine";
import { addRecord, ranking, removeRecord, toRecord, type GameRecord } from "./history";

const rec = (id: string, ...names: string[]): GameRecord => ({
  id,
  finishedAt: "2026-11-18T08:00:00.000Z",
  target: 101,
  results: names.map((name, i) => ({ name, place: i + 1 })),
});

describe("historia gier", () => {
  it("zapisuje klasyfikację zakończonej gry", () => {
    const players = [
      { id: "a", name: "Ania" },
      { id: "b", name: "Bartek" },
    ];
    const g = [50, 101].reduce(applyTurn, createGame(players, 101));
    expect(toRecord(g).results).toEqual([
      { name: "Bartek", place: 1 },
      { name: "Ania", place: 2 },
    ]);
  });

  it("nie dubluje gry i pozwala ją usunąć (cofnięcie)", () => {
    let h = addRecord([], rec("1", "A", "B"));
    h = addRecord(h, rec("1", "B", "A"));
    expect(h).toHaveLength(1);
    expect(h[0].results[0].name).toBe("B");
    expect(removeRecord(h, "1")).toEqual([]);
  });

  it("ranking wg średniego miejsca z ostatnich gier", () => {
    const h = [rec("3", "Bartek", "Ania", "Celina"), rec("2", "Ania", "bartek"), rec("1", "Ania", "Bartek")];
    const r = ranking(h);
    expect(r.map((x) => [x.name, x.games, x.wins, Number(x.avgPlace.toFixed(2))])).toEqual([
      ["Ania", 3, 2, 1.33],
      ["Bartek", 3, 1, 1.67],
      ["Celina", 1, 0, 3],
    ]);
  });

  it("bierze tylko ostatnie N gier i pomija gry solo", () => {
    const h = [rec("3", "Solo"), rec("2", "B", "A"), rec("1", "A", "B")];
    expect(ranking(h, 1).map((x) => x.name)).toEqual(["B", "A"]);
  });
});
