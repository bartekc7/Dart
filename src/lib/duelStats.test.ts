import { describe, expect, it } from "vitest";
import { applyTurn, createGame } from "./game/engine";
import type { GameState } from "./game/types";
import { addRecordsGame } from "./game/records";
import { duelRecords, duelTotals, headToHead, soloView, type FinishedDuel } from "./duelStats";

const A = { id: "a", name: "Ania" };
const B = { id: "b", name: "Bartek" };

/** Gra do 101 z podanych serii (na zmianę, zaczyna pierwszy z `order`). */
function duel(id: string, scores: number[], endedAt: number, order = [A, B]): FinishedDuel {
  let s: GameState = { ...createGame(order, 101), id };
  for (const x of scores) s = applyTurn(s, x, undefined, undefined, { at: endedAt });
  const last = s.turns.at(-1)!.playerId;
  return { id, target: 101, state: s, winnerId: last, endedAt };
}

describe("statystyki 1 na 1", () => {
  const g1 = duel("1", [60, 20, 41], 1000); // wygrywa Ania w 2 seriach
  const g2 = duel("2", [10, 60, 10, 41], 2000); // wygrywa Bartek
  const g3 = duel("3", [20, 60, 30, 41], 3000); // Bartek znowu

  it("bilans i średnia gracza", () => {
    expect(duelTotals([g1, g2, g3], "a")).toMatchObject({ games: 3, won: 1, lost: 2 });
    expect(duelTotals([g1], "a").average).toBeCloseTo(50.5);
  });

  it("Ty vs rywal: seria wygranych, porównanie, ostatnie gry", () => {
    const h = headToHead([g1, g2, g3], "a", "b");
    expect(h).toMatchObject({ won: 1, lost: 2, streak: { winnerId: "b", n: 2 }, since: 1000 });
    expect(h.me).toMatchObject({ best: 60, fastest: 2 });
    expect(h.rival).toMatchObject({ best: 60, fastest: 2 });
    expect(h.recent.map((r) => r.id)).toEqual(["3", "2", "1"]);
    expect(h.recent[0].won).toBe(false);
  });

  it("rekordy są osobiste: seria rywala nie zabiera mi rekordu", () => {
    const rec = duelRecords([g1, g2, g3], "a");
    expect(rec.personal.a.series.value).toBe(60);
    expect(rec.personal.a["fastest:101"].value).toBe(2);
    expect(rec.personal["b"]).toBeUndefined();
    // Nowa gra Ani z serią 100 bije jej rekord (po 3 grach liczy się od razu).
    const next = duel("4", [100, 0, 1], 4000);
    const events = addRecordsGame(rec, soloView(next.state, "a", 4000)).events;
    expect(events.some((e) => e.key === "series" && e.value === 100 && e.prev.value === 60)).toBe(true);
  });
});
