import { describe, expect, it } from "vitest";
import { agoLabel, eventLabel, fillDays, isClientEvent, isEventType, warsawDay } from "./events";

describe("rejestr zdarzeń – opisy i rodzaje", () => {
  it("zna rodzaje zdarzeń i ich opisy", () => {
    expect(isEventType("game_start")).toBe(true);
    expect(isEventType("toString")).toBe(false);
    expect(isEventType(5)).toBe(false);
    expect(eventLabel("rename").label).toBe("Zmiana nazwy");
    expect(eventLabel("cos_nowego")).toEqual({ label: "cos_nowego", icon: "•" });
  });

  it("telefon może zgłosić tylko wejście do aplikacji i start treningu", () => {
    expect(isClientEvent("app_open")).toBe(true);
    expect(isClientEvent("training_start")).toBe(true);
    expect(isClientEvent("game_end")).toBe(false);
    expect(isClientEvent("league_join")).toBe(false);
  });
});

describe("dni w czasie polskim", () => {
  it("północ UTC to już następny dzień w Polsce", () => {
    expect(warsawDay(new Date("2026-11-27T23:30:00Z"))).toBe("2026-11-28");
    expect(warsawDay(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
    expect(warsawDay(new Date("2026-07-01T22:00:00Z"))).toBe("2026-07-02");
  });

  it("fillDays daje pełną serię z zerami, najstarszy dzień pierwszy", () => {
    const now = new Date("2026-11-27T19:00:00Z");
    const days = fillDays(
      [
        { day: "2026-11-27", kind: "games", count: 3 },
        { day: "2026-11-27", kind: "trainings", count: 2 },
        { day: "2026-11-25", kind: "duels", count: 1 },
        { day: "2026-10-01", kind: "games", count: 9 }, // poza zakresem
      ],
      4,
      now,
    );
    expect(days.map((d) => d.day)).toEqual(["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
    expect(days[3]).toEqual({ day: "2026-11-27", games: 3, trainings: 2, duels: 0 });
    expect(days[1].duels).toBe(1);
    expect(days[0]).toEqual({ day: "2026-11-24", games: 0, trainings: 0, duels: 0 });
  });

  it("zmiana czasu nie gubi ani nie dubluje dni", () => {
    const days = fillDays([], 5, new Date("2026-03-31T10:00:00Z"));
    expect(days.map((d) => d.day)).toEqual(["2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"]);
  });

  it("agoLabel mówi krótko i po polsku", () => {
    const now = new Date("2026-11-27T19:00:00Z"); // 20:00 w Polsce
    expect(agoLabel(null, now)).toBe("—");
    expect(agoLabel(new Date("2026-11-27T18:59:30Z"), now)).toBe("przed chwilą");
    expect(agoLabel(new Date("2026-11-27T18:45:00Z"), now)).toBe("15 min temu");
    expect(agoLabel(new Date("2026-11-27T08:05:00Z"), now)).toBe("dziś 09:05");
    expect(agoLabel(new Date("2026-11-26T17:04:00Z"), now)).toBe("wczoraj 18:04");
    expect(agoLabel(new Date("2026-11-12T08:30:00Z"), now)).toBe("12.11 09:30");
    expect(agoLabel(new Date("2025-11-12T08:30:00Z"), now)).toBe("12.11.2025 09:30");
  });
});
