import { describe, expect, it } from "vitest";
import { ranking, rankingWithTrend, type GameRecord } from "./history";

const rec = (id: string, ...names: string[]): GameRecord => ({
  id,
  finishedAt: "2026-11-18T08:00:00.000Z",
  target: 101,
  results: names.map((name, i) => ({ name, place: i + 1 })),
});

describe("ranking ligi", () => {
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

  it("strzałki trendu: zmiana pozycji po ostatniej grze", () => {
    // najnowsza pierwsza: Celina wygrywa i pierwszy raz gra, Bartek wyprzedza Anię
    const h = [rec("3", "Bartek", "Celina", "Ania"), rec("2", "Ania", "Bartek"), rec("1", "Ania", "Bartek")];
    const r = rankingWithTrend(h);
    expect(r.map((x) => [x.name, x.trend])).toEqual([
      ["Ania", 0],
      ["Bartek", 0],
      ["Celina", "new"],
    ]);
    const r2 = rankingWithTrend([rec("4", "Bartek", "Ania"), ...h]);
    expect(r2.map((x) => [x.name, x.trend])).toEqual([
      ["Bartek", 1],
      ["Ania", -1],
      ["Celina", 0],
    ]);
    expect(rankingWithTrend([rec("1", "A", "B")])[0].trend).toBeUndefined();
  });

  it("okno porównania ma ten sam rozmiar", () => {
    const h = [rec("2", "B", "A"), rec("1", "A", "B")];
    // przy oknie 1 gry: teraz B > A, wcześniej A > B
    expect(rankingWithTrend(h, 1).map((x) => [x.name, x.trend])).toEqual([
      ["B", 1],
      ["A", -1],
    ]);
  });
});
