import { describe, expect, it } from "vitest";
import { joinTarget } from "./joinLink";

describe("joinTarget", () => {
  it("link zaproszenia, z adresem lub bez", () => {
    expect(joinTarget("https://dart-orcin.vercel.app/dolacz/EJBDF829")).toBe("/dolacz/EJBDF829");
    expect(joinTarget("  dart-orcin.vercel.app/dolacz/ejbdf829 ")).toBe("/dolacz/EJBDF829");
    expect(joinTarget("Dołącz do ligi „Biuro” w Dart: https://x.app/dolacz/EJBDF829")).toBe("/dolacz/EJBDF829");
  });

  it("link nowego telefonu zachowuje wielkość liter", () => {
    expect(joinTarget("https://x.app/przypisz/WQCmAtULH0d7QANu-_Vc")).toBe("/przypisz/WQCmAtULH0d7QANu-_Vc");
  });

  it("sam kod ligi", () => {
    expect(joinTarget("ejbd f829")).toBe("/dolacz/EJBDF829");
    expect(joinTarget("EJBD-F829")).toBe("/dolacz/EJBDF829");
  });

  it("inny tekst to nie kod ligi", () => {
    expect(joinTarget("")).toBeNull();
    expect(joinTarget("https://example.com")).toBeNull();
    expect(joinTarget("ABC")).toBeNull();
  });
});
