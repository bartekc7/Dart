import { describe, expect, it } from "vitest";
import { LATEST_ID, RELEASES, shouldShow, unseenReleases } from "./whatsNew";

describe("co nowego", () => {
  it("nie pokazuje nowej osobie", () => {
    expect(shouldShow(null, false)).toBe(false);
  });

  it("pokazuje raz komuś, kto grał wcześniej", () => {
    expect(shouldShow(null, true)).toBe(true);
    expect(shouldShow(LATEST_ID, true)).toBe(false);
  });

  it("pokazuje po nowym wydaniu", () => {
    expect(shouldShow("2000-01-01", false)).toBe(true);
    expect(unseenReleases("2000-01-01")).toEqual(RELEASES);
  });

  it("wydania są od najnowszego, z unikalnymi id", () => {
    const ids = RELEASES.map((r) => r.id);
    expect([...ids].sort().reverse()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
