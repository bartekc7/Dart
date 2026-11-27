import { describe, expect, it } from "vitest";
import { deployInfo, prNumber } from "./deploy";

describe("wersja na produkcji", () => {
  it("czyta numer PR z komunikatu commita", () => {
    expect(prNumber("Merge pull request #45 from bartekc7/claude/x\n\nPanel admina")).toBe(45);
    expect(prNumber("Panel admina (#12)")).toBe(12);
    expect(prNumber("Panel admina (#12)\n\nopis (#99)")).toBe(12);
    expect(prNumber("Poprawka #3 w tekście")).toBeNull();
    expect(prNumber("")).toBeNull();
    expect(prNumber(undefined)).toBeNull();
  });

  it("składa dane z zmiennych Vercela", () => {
    const info = deployInfo({
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_SHA: "70401fa0123456789abcdef0123456789abcdef0",
      VERCEL_GIT_COMMIT_MESSAGE: "Merge pull request #45 from bartekc7/claude/project-thread-piw8zf\n\nDart Admin",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_GIT_PROVIDER: "github",
      VERCEL_GIT_REPO_OWNER: "bartekc7",
      VERCEL_GIT_REPO_SLUG: "Dart",
      VERCEL_REGION: "fra1",
      BUILD_TIME: "2026-11-27T20:00:00.000Z",
    });
    expect(info).toEqual({
      env: "production",
      sha: "70401fa0123456789abcdef0123456789abcdef0",
      shortSha: "70401fa",
      message: "Merge pull request #45 from bartekc7/claude/project-thread-piw8zf",
      pr: 45,
      branch: "main",
      builtAt: "2026-11-27T20:00:00.000Z",
      region: "fra1",
      commitUrl: "https://github.com/bartekc7/Dart/commit/70401fa0123456789abcdef0123456789abcdef0",
      prUrl: "https://github.com/bartekc7/Dart/pull/45",
    });
  });

  it("lokalnie bez zmiennych nie wymyśla danych", () => {
    const info = deployInfo({ NODE_ENV: "development", BUILD_TIME: "zła data" });
    expect(info).toMatchObject({ env: "development", sha: null, pr: null, builtAt: null, commitUrl: null, prUrl: null });
  });
});
