import { describe, expect, it } from "vitest";
import {
  addAim, addCheckout, addClock, aimSummary, AIM_DARTS, CHECKOUT_ROUNDS, clockField, formatScore, isTrainingOver,
  isTrainingRecord, isTrainingState, startTraining, trainingScore, trainingStats, undoTraining, type TrainingRecord,
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
