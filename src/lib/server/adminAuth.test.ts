import { describe, expect, it } from "vitest";
import { adminKey, checkKey, isAdminSession, sessionValue } from "./adminAuth";

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
});
