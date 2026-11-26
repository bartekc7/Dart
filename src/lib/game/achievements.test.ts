import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  addGame,
  computeProgress,
  emptyProgress,
  longestWeekRun,
  newlyUnlocked,
  progressOf,
  type AchGame,
} from "./achievements";
import { fieldValue } from "./engine";
import type { Turn } from "./types";

// Środa 26.11.2026 i piątek 27.11.2026, południe w Polsce.
const WED = Date.UTC(2026, 10, 26, 11);
const FRI = Date.UTC(2026, 10, 27, 11);
const DAY = 86_400_000;

/** Seria w trybie sumy. */
const sum = (playerId: string, scored: number, bust = false): Turn => ({ playerId, scored, bust });
/** Seria w trybie rzutek z polami, np. ["T20", "5"]. */
const darts = (playerId: string, fields: string[], bust = false): Turn => {
  const d = fields.map((f) => fieldValue(f)!);
  return { playerId, scored: d.reduce((a, b) => a + b, 0), bust, darts: d, fields };
};

function game(turns: Turn[], opts: Partial<AchGame> = {}): AchGame {
  return { id: "g1", target: 101, players: ["a", "b"], turns, at: WED, ...opts };
}

const ids = (g: AchGame, member = "a") => Object.keys(addGame(emptyProgress(), member, g).unlocked).map(Number).sort((x, y) => x - y);

describe("osiągnięcia", () => {
  it("ma 75 pozycji z unikalnymi numerami", () => {
    expect(ACHIEVEMENTS).toHaveLength(75);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(75);
  });

  it("gra w pojedynkę się nie liczy", () => {
    expect(ids(game([sum("a", 60)], { players: ["a"] }))).toEqual([]);
  });

  it("serie w trybie sumy: 60, 40, 1, 0 i 100", () => {
    expect(ids(game([sum("a", 60), sum("b", 0)]))).toEqual([17]);
    expect(ids(game([sum("a", 40), sum("b", 5), sum("a", 1), sum("b", 5), sum("a", 0)]))).toEqual([2, 15, 26]);
    expect(ids(game([sum("a", 100)]))).toEqual([49, 70]);
  });

  it("wygrana: pierwsza, szybka, demolka i wielki finał", () => {
    const g = game([sum("a", 41), sum("b", 10), sum("a", 60)], { places: { a: 1, b: 2 } });
    expect(ids(g)).toEqual([3, 9, 17, 22, 23, 30, 48]);
    // Przegrany dostaje pierwszą przegraną.
    expect(ids(g, "b")).toEqual([4]);
  });

  it("drugie miejsce kończy grę (zero absolutne), ale nie wygrywa", () => {
    const g = game([sum("b", 101), sum("a", 50), sum("a", 51)], { players: ["a", "b", "c"] });
    // Po zakończeniu „b” kolejność już nie ma znaczenia dla testu – liczymy serie „a”.
    expect(ids(g)).toContain(9);
    expect(ids(g)).not.toContain(3);
  });

  it("przekroczenia, wygrana z 1 punktu i po przekroczeniu", () => {
    const turns = [
      sum("a", 100), sum("b", 10),
      sum("a", 5, true), sum("b", 10),
      sum("a", 3, true), sum("b", 10),
      sum("a", 2, true), sum("b", 10),
      sum("a", 1),
    ];
    expect(ids(game(turns))).toEqual(expect.arrayContaining([14, 19, 31]));
    expect(ids(game(turns))).not.toContain(20);
  });

  it("powrót z zaświatów", () => {
    const turns = [sum("a", 20), sum("b", 95), sum("a", 81)];
    expect(ids(game(turns))).toContain(43);
    expect(ids(game([sum("a", 60), sum("b", 95), sum("a", 41)]))).not.toContain(43);
  });

  it("pola w trybie rzutek", () => {
    expect(ids(game([darts("a", ["20", "20", "20"])]))).toEqual([5, 12, 13, 17, 35, 36]);
    expect(ids(game([darts("a", ["T20", "D20", "1"])], { target: 201 }))).toEqual([1, 5, 7, 8, 49, 74]);
    expect(ids(game([darts("a", ["25", "D25", "25"])]))).toEqual([5, 24, 25, 41, 49, 70, 75]);
    expect(ids(game([darts("a", ["1", "5", "20"])]))).toEqual([1, 5, 12, 40, 47]);
  });

  it("zakończenie double, wygrana trzecią rzutką i w 3 rzutkach", () => {
    const g = game([darts("a", ["T20", "T7", "D10"])]);
    expect(ids(g)).toEqual(expect.arrayContaining([3, 9, 21, 23, 27, 32, 68]));
    expect(ids(g)).not.toContain(69);
    expect(ids(game([darts("a", ["T17", "D25"])]))).toEqual(expect.arrayContaining([34, 69]));
  });

  it("przekroczenie pierwszą rzutką", () => {
    const g = game([sum("a", 95), sum("b", 0), darts("a", ["T20"], true)]);
    expect(ids(g)).toContain(18);
  });

  it("liczniki meczów, wygranych i serii", () => {
    const games: AchGame[] = [];
    for (let i = 0; i < 10; i++) {
      games.push(game([sum("a", 101)], { id: `g${i}`, at: WED + i * 7 * DAY, places: { a: 1, b: 2 } }));
    }
    const p = computeProgress(games);
    const a = Object.keys(p.a.unlocked).map(Number);
    expect(a).toEqual(expect.arrayContaining([3, 6, 10, 50, 54, 60, 72]));
    expect(p.a.unlocked[6].gameId).toBe("g4");
    expect(p.b.lossStreak).toBe(10);
    expect(Object.keys(p.b.unlocked).map(Number)).toEqual(expect.arrayContaining([4, 44]));
    expect(progressOf(p.a, 51)).toEqual({ value: 10, goal: 25, unit: "meczów" });
    expect(progressOf(p.a, 3)).toBeNull();
  });

  it("piątki liczone po polskiej dacie", () => {
    const fridays = [0, 1, 2, 3, 4].map((w) =>
      game([sum("a", 101)], { id: `f${w}`, at: FRI + w * 7 * DAY, places: { a: 1, b: 2 } }),
    );
    expect(computeProgress(fridays.slice(0, 4)).a.unlocked[59]).toBeUndefined();
    expect(computeProgress(fridays).a.unlocked[59]).toBeDefined();
  });

  it("ciąg tygodni", () => {
    expect(longestWeekRun([5, 1, 2, 3, 7, 8])).toBe(3);
    expect(longestWeekRun([])).toBe(0);
  });

  it("trwająca gra pokazuje tylko nowe osiągnięcia", () => {
    const base = computeProgress([game([sum("a", 60), sum("b", 101)], { places: { b: 1, a: 2 } })]).a;
    const live = addGame(base, "a", game([sum("a", 60), sum("b", 40)], { id: "g2" }));
    expect(newlyUnlocked(base, live)).toEqual([]);
    const later = addGame(base, "a", game([sum("a", 60), sum("b", 40), sum("a", 41)], { id: "g2" }));
    expect(newlyUnlocked(base, later).map((x) => x.id)).toEqual([3, 9, 22, 23]);
  });
});
