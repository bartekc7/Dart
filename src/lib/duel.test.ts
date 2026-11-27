import { describe, expect, it } from "vitest";
import { distinctLooks, isDuelTarget, playOrder, rematchStarter } from "./duel";
import { applyTurn, createGame } from "./game/engine";

const a = { id: "a", name: "Ania", color: 0, icon: null };
const b = { id: "b", name: "Bartek", color: 0, icon: null };

describe("1 na 1", () => {
  it("ten sam znak u obu graczy: rywal dostaje na czas gry inny kolor", () => {
    expect(distinctLooks(a, b)[1].color).toBe(1);
    expect(distinctLooks(a, { ...b, color: 4 })[1].color).toBe(4);
    expect(distinctLooks({ ...a, color: -1, icon: "🐛" }, { ...b, color: -1, icon: "🐛" })[1]).toMatchObject({ color: 0, icon: null });
  });

  it("zaczynający rzuca pierwszy", () => {
    expect(playOrder(a, b, "b").map((p) => p.id)).toEqual(["b", "a"]);
    expect(playOrder(a, b, "a").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("rewanż zaczyna przegrany", () => {
    let g = createGame([a, b], 101);
    g = applyTurn(g, 101);
    expect(rematchStarter(g, "a")).toBe("b");
  });

  it("cele 101/201/301/501", () => {
    expect([101, 201, 301, 501].every(isDuelTarget)).toBe(true);
    expect(isDuelTarget(150)).toBe(false);
    expect(isDuelTarget("101")).toBe(false);
  });
});
