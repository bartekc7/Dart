import { describe, expect, it } from "vitest";
import {
  addAim, addCheckout, addClock, addFree, aimSummary, AIM_DARTS, CHECKOUT_ROUNDS, clockField, endFree, formatScore,
  freeSummary, freeTotals, isFreeSeriesRecord, isTrainingOver, MODES,
  isTrainingRecord, isTrainingState, startTraining, trainingScore, trainingStats, undoTraining, type TrainingRecord, type TrainingState,
} from "./training";

const rec = (score: number, i: number, mode: TrainingRecord["mode"] = "aim", variant = "20"): TrainingRecord => ({
  id: `t${i}`, mode, variant, score, data: startTraining(mode), startedAt: i, finishedAt: i * 1000,
});

describe("treningi", () => {
  it("celowanie: 30 rzutek, procent trafień i punkty", () => {
    let s = startTraining("aim", "20");
    for (let i = 0; i < AIM_DARTS; i++) s = addAim(s, i < 3 ? "T" : i < 12 ? "S" : "0");
    expect(isTrainingOver(s)).toBe(true);
    expect(addAim(s, "S")).toBe(s);
    expect(trainingScore(s)).toBe(40);
    expect(aimSummary("20", s.mode === "aim" ? s.darts : [])).toMatchObject({ hits: 12, triples: 3, points: 3 * 60 + 9 * 20, per3: 36 });
    expect(aimSummary("25", ["S", "D", "0"])).toMatchObject({ points: 75, percent: 67 });
  });

  it("dookoła tarczy: 1–20 i Bull, wynik to liczba rzutek", () => {
    let s = startTraining("clock");
    s = addClock(s, false);
    s = addClock(s, true);
    expect(s.mode === "clock" && clockField(s.darts)).toBe(2);
    for (let i = 0; i < 20; i++) s = addClock(s, true);
    expect(isTrainingOver(s)).toBe(true);
    expect(trainingScore(s)).toBe(22);
    expect(formatScore("clock", 22)).toBe("22 rzutki");
    expect(formatScore("clock", 45)).toBe("45 rzutek");
  });

  it("kończenie: 10 losowych końcówek 2–60", () => {
    let s = startTraining("checkout", "20", () => 0.999);
    expect(s.mode === "checkout" && s.targets).toEqual(Array(CHECKOUT_ROUNDS).fill(60));
    s = startTraining("checkout", "20", () => 0);
    expect(s.mode === "checkout" && s.targets[0]).toBe(2);
    for (let i = 0; i < CHECKOUT_ROUNDS; i++) s = addCheckout(s, i % 2 === 0);
    expect(isTrainingOver(s)).toBe(true);
    expect(formatScore("checkout", trainingScore(s))).toBe("5 z 10");
    expect(trainingScore(undoTraining(s))).toBe(5);
  });

  it("rozpoznaje zapisany stan", () => {
    expect(isTrainingState(startTraining("aim", "19"))).toBe(true);
    expect(isTrainingState({ mode: "aim", target: "7", darts: [], startedAt: 1 })).toBe(false);
    expect(isTrainingState(null)).toBe(false);
  });

  it("statystyki: najlepszy, średnia z 10 ostatnich i trend", () => {
    const list = Array.from({ length: 20 }, (_, i) => rec(i < 10 ? 30 : 40, i + 1));
    list.push(rec(90, 50, "aim", "19"));
    const s = trainingStats(list, "aim", "20");
    expect(s).toMatchObject({ count: 20, recentAvg: 40, trend: 10 });
    expect(s.best?.score).toBe(40);
    expect(s.best?.id).toBe("t11");
  });

  it("dookoła tarczy: mniej rzutek = lepiej", () => {
    const list = [rec(50, 1, "clock", ""), rec(41, 2, "clock", ""), rec(60, 3, "clock", "")];
    expect(trainingStats(list, "clock", "").best?.score).toBe(41);
    expect(isTrainingRecord(list, { id: "x", mode: "clock", variant: "", score: 40 })?.score).toBe(41);
    expect(isTrainingRecord(list, { id: "x", mode: "clock", variant: "", score: 41 })).toBeNull();
  });

  it("pierwszy trening to nie rekord", () => {
    expect(isTrainingRecord([], { id: "x", mode: "aim", variant: "20", score: 50 })).toBeNull();
  });
});

describe("trening swobodny", () => {
  it("jest pierwszy na liście trybów", () => {
    expect(MODES[0].mode).toBe("free");
  });

  it("zapisuje rzutki, liczy serie po 3 i kończy się, kiedy gracz chce", () => {
    let s = startTraining("free");
    expect(isTrainingOver(s)).toBe(false);
    expect(endFree(s)).toBe(s); // bez rzutek nie ma czego kończyć
    for (const f of ["T20", "20", "5", "D25", "0", "X"]) s = addFree(s, f);
    expect(s.mode === "free" && s.darts).toEqual(["T20", "20", "5", "D25", "0"]);
    expect(freeSummary(s.mode === "free" ? s.darts : [])).toMatchObject({ darts: 5, points: 135, series: [85, 50], bestSeries: 85, per3: 81 });
    expect(trainingScore(s)).toBe(81);
    s = endFree(s);
    expect(isTrainingOver(s)).toBe(true);
    expect(addFree(s, "20")).toBe(s);
    expect(formatScore("free", 81)).toBe("81,0 śr.");
    const back = undoTraining(s);
    expect(isTrainingOver(back)).toBe(false);
    expect(back.mode === "free" && back.darts.length).toBe(4);
    expect(isTrainingState(s)).toBe(true);
    expect(isTrainingState({ mode: "free", darts: [], startedAt: 1 })).toBe(false);
  });

  const free = (i: number, darts: string[], minutes = 5): TrainingRecord => {
    const data: TrainingState = { mode: "free", darts, ended: true, startedAt: 0 };
    return { id: `f${i}`, mode: "free", variant: "", score: trainingScore(data), data, startedAt: i * 1e6, finishedAt: i * 1e6 + minutes * 60000 };
  };

  it("rekord średniej dopiero od 30 rzutek", () => {
    const short = free(1, ["T20", "T20", "T20"]);
    const long = free(2, Array(30).fill("20"));
    expect(trainingStats([short, long], "free", "").best?.id).toBe("f2");
    const better = free(3, Array(30).fill("T20"));
    expect(isTrainingRecord([short, long], better)?.id).toBe("f2");
    expect(isTrainingRecord([short, long], free(4, ["T20", "T20", "T20"]))).toBeNull();
  });

  it("podsumowanie: rzutki, średnia ważona, najlepsza seria i czas", () => {
    const list = [free(1, ["T20", "T20", "T20"], 2), free(2, Array(9).fill("1"), 10), rec(40, 3)];
    expect(freeTotals(list)).toMatchObject({ count: 2, darts: 12, per3: 47.3, bestSeries: 180, bestSeriesId: "f1", minutes: 12 });
    expect(isFreeSeriesRecord(list, "x", ["T20", "T20", "T19"])).toBeNull();
    expect(isFreeSeriesRecord(list.slice(1), "x", ["T20", "T20", "T19"])).toBe(3);
    expect(isFreeSeriesRecord([], "x", ["T20"])).toBeNull();
  });
});
