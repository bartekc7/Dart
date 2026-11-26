import { describe, expect, it } from "vitest";
import { ALL_LOOKS, defaultLook, lookKey, parseLook, PLAYER_ICONS, suggestedLook } from "./looks";

describe("znak gracza", () => {
  it("najwyżej 30 różnych ikonek i 40 znaków razem", () => {
    expect(PLAYER_ICONS.length).toBeLessThanOrEqual(30);
    expect(new Set(PLAYER_ICONS.map((x) => x.icon)).size).toBe(PLAYER_ICONS.length);
    expect(new Set(ALL_LOOKS).size).toBe(ALL_LOOKS.length);
  });

  it("odczytuje tylko znane znaki", () => {
    expect(parseLook("color:3")).toEqual({ color: 3, icon: null });
    expect(parseLook("icon:🐛")).toEqual({ color: null, icon: "🐛" });
    expect(parseLook("color:10")).toBeNull();
    expect(parseLook("icon:🍎")).toBeNull();
    expect(parseLook(5)).toBeNull();
    expect(lookKey({ color: 13, icon: null })).toBe("color:3");
    expect(lookKey({ color: -1, icon: "☕" })).toBe("icon:☕");
  });

  it("bez wyboru: kolor wg kolejności, a gdy zajęty – pierwszy wolny kolor, potem ikonka", () => {
    expect(defaultLook(2, ["color:0", "color:1"])).toEqual({ color: 2, icon: null });
    expect(defaultLook(2, ["color:2"])).toEqual({ color: 0, icon: null });
    const allColors = ALL_LOOKS.filter((k) => k.startsWith("color:"));
    expect(defaultLook(10, allColors)).toEqual({ color: null, icon: PLAYER_ICONS[0].icon });
    expect(defaultLook(41, ALL_LOOKS)).toEqual({ color: 1, icon: null }); // wszystko zajęte: kolor się powtarza
    expect(suggestedLook(["color:0", "icon:🐛"])).toBe("color:2");
  });
});
