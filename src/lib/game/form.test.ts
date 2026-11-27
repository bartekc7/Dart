import { describe, expect, it } from "vitest";
import { computeForm, gameAverage, type FormGame } from "./form";

const games = (avgs: number[], opts: { duel?: number[]; won?: number[] } = {}): FormGame[] =>
  avgs.map((avg, i) => ({ at: 1000 + i, avg, won: !!opts.won?.includes(i), duel: opts.duel?.includes(i) }));

describe("forma gracza", () => {
  it("średnia na serię w grze liczy przekroczenia jako 0", () => {
    const turns = [
      { playerId: "a", scored: 60, bust: false },
      { playerId: "b", scored: 100, bust: false },
      { playerId: "a", scored: 45, bust: true },
      { playerId: "a", scored: 30, bust: false },
    ];
    expect(gameAverage(turns, "a")).toBe(30);
    expect(gameAverage(turns, "c")).toBeNull();
  });

  it("poniżej 6 gier jeszcze jej nie ma", () => {
    expect(computeForm(games([30, 30, 30, 30, 30]))).toEqual({ ready: false, games: 5, needed: 6 });
  });

  it("porównuje 5 ostatnich gier z 5 wcześniejszymi i bierze tylko 10 ostatnich", () => {
    // Najstarsza gra (100) wypada poza okno 10 gier.
    const f = computeForm(games([100, 27, 31, 25, 33, 29, 30, 36, 33, 38, 34], { won: [7, 9], duel: [8] }));
    if (!f.ready) throw new Error("forma powinna być gotowa");
    expect(f.older).toEqual({ games: 5, avg: 29, wins: 0 });
    expect(f.newer.avg).toBeCloseTo(34.2);
    expect(f.newer.wins).toBe(2);
    expect(f.direction).toBe("up");
    expect(f.delta).toBeCloseTo(5.2);
    expect(f.change).toBeCloseTo(5.2 / 29);
    expect(f.points).toHaveLength(10);
    expect(f.points[7]).toEqual({ avg: 33, duel: true });
  });

  it("układa gry według czasu, nie kolejności podania", () => {
    const g = games([20, 20, 20, 40, 40, 40]).reverse();
    const f = computeForm(g);
    expect(f.ready && f.direction).toBe("up");
  });

  it("przy 6–9 grach dzieli je mniej więcej po połowie (starsza połowa większa)", () => {
    const f = computeForm(games([30, 30, 30, 30, 20, 20, 20]));
    if (!f.ready) throw new Error();
    expect(f.older.games).toBe(4);
    expect(f.newer.games).toBe(3);
    expect(f.direction).toBe("down");
  });

  it("zmiana poniżej 10% to forma stabilna, od 10% – rośnie albo spada", () => {
    const base = [30, 30, 30, 30, 30];
    expect(computeForm(games([...base, 32, 32, 32, 32, 32])).ready && "ok").toBe("ok");
    const flat = computeForm(games([...base, 32.9, 32.9, 32.9, 32.9, 32.9]));
    expect(flat.ready && flat.direction).toBe("flat");
    const up = computeForm(games([...base, 33, 33, 33, 33, 33]));
    expect(up.ready && up.direction).toBe("up");
    const down = computeForm(games([...base, 27, 27, 27, 27, 27]));
    expect(down.ready && down.direction).toBe("down");
  });

  it("gdy wcześniej średnia była 0, każdy postęp to wzrost", () => {
    const f = computeForm(games([0, 0, 0, 5, 5, 5]));
    expect(f.ready && f.direction).toBe("up");
    expect(f.ready && f.change).toBeNull();
  });
});
