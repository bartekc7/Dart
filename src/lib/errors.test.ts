import { describe, expect, it } from "vitest";
import { errorSummary, ERROR_MESSAGE_MAX, routeLabel } from "./errors";

describe("rejestr błędów", () => {
  it("ścieżka bez identyfikatorów i parametrów", () => {
    expect(routeLabel("/api/duels/aB3xY9q2/accept")).toBe("/api/duels/:id/accept");
    expect(routeLabel("/api/members/0f1e2d3c-1111-2222-3333-444455556666/stats")).toBe("/api/members/:id/stats");
    expect(routeLabel("/api/join/KQ7TZ2MD?x=Ania")).toBe("/api/join/:id");
    expect(routeLabel("/api/league")).toBe("/api/league");
    expect(routeLabel("/")).toBe("/");
    expect(routeLabel("/gracz/abc123/osiagniecia")).toBe("/gracz/:id/osiagniecia");
  });

  it("komunikat bez wartości z bazy", () => {
    const e = Object.assign(new Error('duplicate key value violates unique constraint "members_league_name"\nDETAIL: Key (league_id, lower(name))=(x, ania) already exists.'), {
      code: "23505",
    });
    expect(errorSummary(e)).toEqual({ kind: "Error 23505", message: 'duplicate key value violates unique constraint "…"' });
    expect(errorSummary(new TypeError("Cannot read properties of undefined (reading 'turns')"))).toEqual({
      kind: "TypeError",
      message: "Cannot read properties of undefined (…)",
    });
  });

  it("radzi sobie z dziwnymi wartościami", () => {
    expect(errorSummary("coś")).toEqual({ kind: "Error", message: "coś" });
    expect(errorSummary(null)).toEqual({ kind: "Nieznany błąd", message: "(brak komunikatu)" });
    expect(errorSummary({ digest: "12345" }).message).toBe("digest 12345");
    expect(errorSummary(new Error("x".repeat(500))).message).toHaveLength(ERROR_MESSAGE_MAX);
    expect(errorSummary(Object.assign(new Error("a"), { code: "zły kod; drop" })).kind).toBe("Error");
  });
});
