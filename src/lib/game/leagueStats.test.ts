import { describe, expect, it } from "vitest";
import { computeLeagueStats, formatDuration, gamesByWeekday, type StatsGame } from "./leagueStats";

const members = [
  { id: "a", name: "Ania", color: 0 },
  { id: "b", name: "Bartek", color: 1 },
];

const t = (playerId: string, scored: number, extra: Partial<{ bust: boolean; fields: string[] }> = {}) => ({
  playerId,
  scored,
  bust: false,
  ...extra,
});

const games: StatsGame[] = [
  {
    id: "g1",
    finishedAt: "2026-11-16T18:00:00Z", // poniedziałek
    target: 101,
    turns: [t("a", 60, { fields: ["T20", "0", "0"] }), t("b", 41), t("a", 41), t("b", 100, { bust: true }), t("b", 60)],
    results: [
      { memberId: "a", place: 1 },
      { memberId: "b", place: 2 },
    ],
    startedAt: "2026-11-16T17:50:00Z",
    endedAt: "2026-11-16T18:00:00Z",
  },
  {
    id: "g2",
    finishedAt: "2026-11-18T18:00:00Z", // środa
    target: 101,
    turns: [t("a", 26), t("b", 101, { fields: ["T20", "D20", "1"] })],
    results: [
      { memberId: "b", place: 1 },
      { memberId: "a", place: 2 },
    ],
  },
  // Gra solo nie liczy się do statystyk ligi.
  { id: "solo", finishedAt: "2026-11-18T19:00:00Z", target: 101, turns: [t("a", 101)], results: [{ memberId: "a", place: 1 }] },
];

describe("statystyki ligi", () => {
  const s = computeLeagueStats(games, members);

  it("sumuje gry, serie i przekroczenia (bez gier solo)", () => {
    expect(s.games).toBe(2);
    expect(s.series).toBe(7);
    expect(s.busts).toBe(1);
    expect(s.avgPerSeries).toBeCloseTo((60 + 41 + 41 + 60 + 26 + 101) / 7);
  });

  it("wylicza graczy i rekordy", () => {
    expect(s.players.map((p) => [p.name, p.games, p.wins])).toEqual([
      ["Bartek", 2, 1],
      ["Ania", 2, 1],
    ]);
    expect(s.records.bestSeries).toMatchObject({ memberId: "b", value: 101 });
    expect(s.records.fastestWin).toMatchObject({ memberId: "b", value: 1, target: 101 });
    expect(s.records.bestAverage).toBeUndefined(); // nikt nie ma 10 serii
  });

  it("zbiera trafienia ligi i każdego gracza", () => {
    expect(s.hits).toEqual({ T20: 2, "0": 2, D20: 1, "1": 1 });
    expect(s.hitsBy.a).toEqual({ T20: 1, "0": 2 });
    expect(s.hitGames).toBe(2);
    expect(s.hitGamesBy).toEqual({ a: 1, b: 1 });
  });

  it("liczy czas tylko z gier, które go mają", () => {
    expect(s.durations).toEqual({ games: 1, avgMs: 600000, shortestMs: 600000, longestMs: 600000 });
    expect(computeLeagueStats(games.slice(1), members).durations).toBeNull();
  });

  it("wygrana po „Zakończ grę” nie jest najszybszą wygraną", () => {
    const ended: StatsGame = {
      id: "e",
      finishedAt: "2026-11-19T18:00:00Z",
      target: 301,
      turns: [t("a", 60), t("b", 20)],
      results: [
        { memberId: "a", place: 1 },
        { memberId: "b", place: 2 },
      ],
    };
    expect(computeLeagueStats([ended], members).records.fastestWin).toBeUndefined();
  });

  it("dni tygodnia i format czasu", () => {
    const days = gamesByWeekday(["2026-11-16T12:00:00Z", "2026-11-18T12:00:00Z", "2026-11-18T13:00:00Z"]);
    expect(days[0]).toBe(1);
    expect(days[2]).toBe(2);
    expect(formatDuration(45_000)).toBe("45 s");
    expect(formatDuration(12 * 60_000)).toBe("12 min");
    expect(formatDuration(65 * 60_000)).toBe("1 h 5 min");
  });
});
