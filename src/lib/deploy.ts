/**
 * Wersja na produkcji – z systemowych zmiennych Vercela (VERCEL_*) i czasu
 * builda (BUILD_TIME, ustawiany w next.config.ts). Lokalnie większości brak.
 */
export interface DeployInfo {
  /** production / preview / development */
  env: string;
  sha: string | null;
  shortSha: string | null;
  /** Pierwsza linia komunikatu commita. */
  message: string | null;
  pr: number | null;
  branch: string | null;
  builtAt: string | null;
  region: string | null;
  commitUrl: string | null;
  prUrl: string | null;
}

type Env = Record<string, string | undefined>;
// BUILD_TIME trzeba czytać wprost (process.env.BUILD_TIME) – tylko tak Next.js wstawia go przy buildzie.

/** Numer PR z komunikatu: „Merge pull request #45 from …” albo „Tytuł (#45)”. */
export function prNumber(message: string | null | undefined): number | null {
  if (!message) return null;
  const m = /^Merge pull request #(\d+)\b/m.exec(message) ?? /\(#(\d+)\)\s*$/m.exec(message.split("\n")[0]);
  return m ? Number(m[1]) : null;
}

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function deployInfo(env: Env = { ...process.env, BUILD_TIME: process.env.BUILD_TIME }): DeployInfo {
  const sha = clean(env.VERCEL_GIT_COMMIT_SHA);
  const full = clean(env.VERCEL_GIT_COMMIT_MESSAGE);
  const pr = prNumber(full);
  const owner = clean(env.VERCEL_GIT_REPO_OWNER);
  const slug = clean(env.VERCEL_GIT_REPO_SLUG);
  const repo = owner && slug && clean(env.VERCEL_GIT_PROVIDER) !== "gitlab" ? `https://github.com/${owner}/${slug}` : null;
  const built = clean(env.BUILD_TIME);
  return {
    env: clean(env.VERCEL_ENV) ?? (env.NODE_ENV === "production" ? "production (lokalnie)" : "development"),
    sha,
    shortSha: sha ? sha.slice(0, 7) : null,
    message: full ? full.split("\n")[0].slice(0, 200) : null,
    pr,
    branch: clean(env.VERCEL_GIT_COMMIT_REF),
    builtAt: built && !Number.isNaN(Date.parse(built)) ? new Date(built).toISOString() : null,
    region: clean(env.VERCEL_REGION),
    commitUrl: repo && sha ? `${repo}/commit/${sha}` : null,
    prUrl: repo && pr ? `${repo}/pull/${pr}` : null,
  };
}
