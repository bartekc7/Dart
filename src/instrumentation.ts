import type { Instrumentation } from "next";

/**
 * Błędy stron i akcji serwera, których nie łapie `handle()` w API, też trafiają
 * do rejestru błędów panelu admina (bez danych graczy – patrz lib/errors).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const [{ getDb, databaseUrl }, { recordError }] = await Promise.all([import("./lib/server/db"), import("./lib/server/errors")]);
    if (!databaseUrl()) return;
    const source = context.routeType === "render" ? "strona" : context.routeType === "action" ? "akcja" : context.routeType;
    await recordError(await getDb(), { error: err, path: request.path, method: request.method, source });
  } catch {
    // Rejestr nie może sam powodować błędów.
  }
};
