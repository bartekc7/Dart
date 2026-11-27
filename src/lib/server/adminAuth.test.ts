import { describe, expect, it } from "vitest";
import { actionToken, adminKey, checkActionToken, checkKey, isAdminSession, sessionValue } from "./adminAuth";

describe("klucz panelu admina", () => {
  const key = "tajny-klucz-123456";

  it("bez ADMIN_KEY (albo za krótkiego) panel jest wyłączony", () => {
    expect(adminKey({})).toBeNull();
    expect(adminKey({ ADMIN_KEY: "  " })).toBeNull();
    expect(adminKey({ ADMIN_KEY: "krotki" })).toBeNull();
    expect(adminKey({ ADMIN_KEY: ` ${key} ` })).toBe(key);
    expect(checkKey("cokolwiek", null)).toBe(false);
    expect(isAdminSession("cokolwiek", null)).toBe(false);
  });

  it("sprawdza wpisany klucz", () => {
    expect(checkKey(key, key)).toBe(true);
    expect(checkKey(` ${key}\n`, key)).toBe(true);
    expect(checkKey(key.toUpperCase(), key)).toBe(false);
    expect(checkKey("", key)).toBe(false);
    expect(checkKey(undefined, key)).toBe(false);
  });

  it("ciasteczko to podpis, nie sam klucz; zmiana klucza wylogowuje", () => {
    const cookie = sessionValue(key);
    expect(cookie).not.toContain(key);
    expect(isAdminSession(cookie, key)).toBe(true);
    expect(isAdminSession(key, key)).toBe(false);
    expect(isAdminSession(undefined, key)).toBe(false);
    expect(isAdminSession(cookie, "inny-klucz-654321")).toBe(false);
  });

  it("token akcji zapisującej pasuje tylko do tej akcji, tego obiektu i tego klucza", () => {
    const t = actionToken(key, "delete-league", "liga-1");
    expect(checkActionToken(t, key, "delete-league", "liga-1")).toBe(true);
    expect(checkActionToken(t, key, "delete-league", "liga-2")).toBe(false);
    expect(checkActionToken(t, key, "inna-akcja", "liga-1")).toBe(false);
    expect(checkActionToken(t, "inny-klucz-123456", "delete-league", "liga-1")).toBe(false);
    expect(checkActionToken(t, null, "delete-league", "liga-1")).toBe(false);
    expect(checkActionToken("", key, "delete-league", "liga-1")).toBe(false);
    expect(checkActionToken(undefined, key, "delete-league", "liga-1")).toBe(false);
    expect(t).not.toContain(key);
  });
});
