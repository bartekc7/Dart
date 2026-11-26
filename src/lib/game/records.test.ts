import { describe, expect, it } from "vitest";
import type { AchGame } from "./achievements";
import type { Turn } from "./types";
import { addRecordsGame, computeRecords, formatRecord, recordLabel, summarizeEvents } from "./records";

let n = 0;
const T = (playerId: string, scored: number, bust = false): Turn => ({ playerId, scored, bust });
const game = (turns: Turn[], over = true, target = 101): AchGame => {
  const players = [...new Set(turns.map((t) => t.playerId))];
  return {
    id: `g${++n}`,
    target,
    players,
    turns,
    at: 1_000 + n,
    ...(over ? { places: Object.fromEntries(players.map((p, i) => [p, i + 1])) } : {}),
  };
};

/** Historia: a ma 12 serii po 10 i jedną 50, b ma serię 85 (rekord ligi). */
function history() {
  const turns: Turn[] = [];
  for (let i = 0; i < 6; i++) turns.push(T("a", 10), T("b", 5));
  return computeRecords([
    game(turns, true, 1000),
    game([T("a", 50), T("b", 85), T("a", 10), T("b", 16)], true),
    game([T("a", 10), T("b", 10), T("a", 10), T("b", 10), T("a", 10)], true, 1000),
  ]);
}

describe("rekordy", () => {
  it("liczy rekordy osobiste i ligi z historii", () => {
    const s = history();
    expect(s.league.series).toMatchObject({ memberId: "b", value: 85 });
    expect(s.personal.a.series.value).toBe(50);
    expect(s.league["fastest:101"]).toMatchObject({ memberId: "b", value: 2 });
    expect(s.series.a).toBe(11);
  });

  it("nowy rekord ligi połyka rekord osobisty", () => {
    const { events } = addRecordsGame(history(), game([T("a", 100), T("b", 1)], false));
    expect(events).toEqual([expect.objectContaining({ memberId: "a", key: "series", scope: "league", value: 100 })]);
    expect(events[0].prev).toMatchObject({ memberId: "b", value: 85 });
  });

  it("rekord osobisty bez bicia ligi", () => {
    const { events } = addRecordsGame(history(), game([T("a", 60), T("b", 1)], false));
    expect(events).toEqual([expect.objectContaining({ scope: "personal", value: 60 })]);
    expect(events[0].prev.value).toBe(50);
  });

  it("remis i brak poprzedniej wartości to nie rekord", () => {
    expect(addRecordsGame(history(), game([T("a", 50), T("b", 85)], false)).events).toEqual([]);
    expect(addRecordsGame(computeRecords([]), game([T("a", 100), T("b", 1)], false)).events).toEqual([]);
  });

  it("rekord osobisty dopiero po 10 seriach gracza", () => {
    const s = computeRecords([game([T("a", 20), T("b", 5)], true, 1000)]);
    const { events } = addRecordsGame(s, game([T("a", 30), T("b", 1)], false, 1000));
    expect(events.filter((e) => e.memberId === "a")).toEqual([]);
  });

  it("najszybsza wygrana: mniej serii przy tym samym celu", () => {
    const { events } = addRecordsGame(history(), game([T("a", 101), T("b", 3)], true));
    const fast = events.find((e) => e.key === "fastest:101");
    expect(fast).toMatchObject({ memberId: "a", scope: "league", value: 1 });
  });

  it("przekroczenie nie jest serią do rekordu", () => {
    const { events } = addRecordsGame(history(), game([T("a", 120, true), T("b", 1)], false));
    expect(events).toEqual([]);
  });

  it("gra jednoosobowa się nie liczy", () => {
    expect(computeRecords([game([T("a", 180)])]).league).toEqual({});
  });

  it("podsumowanie: końcowa wartość i stan sprzed gry", () => {
    const { events } = addRecordsGame(history(), game([T("a", 60), T("b", 1), T("a", 30), T("b", 1), T("a", 100)], false, 1000));
    const sum = summarizeEvents(events);
    expect(sum).toHaveLength(1);
    expect(sum[0]).toMatchObject({ scope: "league", value: 100 });
    expect(sum[0].prev.value).toBe(85);
  });

  it("opisy", () => {
    expect(recordLabel("fastest:201")).toBe("Najszybsza wygrana do 201");
    expect(formatRecord("fastest:101", 4)).toBe("4 serie");
    expect(formatRecord("average", 38.46)).toBe("38,5");
  });
});
