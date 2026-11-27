import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSchema } from "./db";
import { adminDbSize, adminEvents, adminInactiveLeagues, deleteInactiveLeague, DB_TABLES } from "./admin";
import { adminErrors, pruneErrors, recordError } from "./errors";
import { profileForMember } from "./duels";
import { createLeague, joinLeague, listMembers, newDeviceToken, publishLiveGame, requireMe, saveGame } from "./league";
import { saveTraining } from "./training";
import { addAim, startTraining } from "../training";

/** Testy na prawdziwym Postgresie (TEST_DATABASE_URL), we własnym schemacie. */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("panel admina: błędy, baza i nieaktywne ligi", () => {
  let db: Pool;
  const tokens = { stara: newDeviceToken(), druga: newDeviceToken(), biuro: newDeviceToken(), nowa: newDeviceToken(), gosc: newDeviceToken() };
  const ids: Record<string, string> = {};

  async function leagueWithGame(token: string, league: string, player: string, rival: string) {
    await createLeague(db, token, league, player);
    const me = await requireMe(db, token);
    await joinLeague(db, newDeviceToken(), me.league.joinCode, rival);
    const players = (await listMembers(db, me.league.id)).map((m) => m.id);
    await saveGame(db, me, { id: `${league}-g`, target: 101, players, turns: [{ scored: 101 }] });
    let t = startTraining("aim", "20");
    for (let i = 0; i < 30; i++) t = addAim(t, "S");
    await saveTraining(db, me, { id: `${league}-t`, data: t });
    ids[league] = me.league.id;
    return me;
  }

  async function age(league: string, days: number) {
    const id = ids[league];
    await db.query("update leagues set created_at = now() - make_interval(days => $2) where id = $1", [id, days + 5]);
    await db.query("update games set finished_at = now() - make_interval(days => $2) where league_id = $1", [id, days]);
    await db.query("update trainings set finished_at = now() - make_interval(days => $2) where league_id = $1", [id, days]);
  }

  const count = async (sql: string, args: unknown[] = []) => Number((await db.query(sql, args)).rows[0].n);

  beforeAll(async () => {
    db = new Pool({ connectionString: url, options: "-c search_path=admin_test" });
    await db.query("drop schema if exists admin_test cascade; create schema admin_test;");
    await ensureSchema(db);
    const stara = await leagueWithGame(tokens.stara, "Stara", "Ola", "Piotr");
    await leagueWithGame(tokens.druga, "Druga", "Kasia", "Tomek");
    await leagueWithGame(tokens.biuro, "Biuro", "Ania", "Bartek");
    await createLeague(db, tokens.nowa, "Nowa", "Zenek");
    ids.Nowa = (await requireMe(db, tokens.nowa)).league.id;
    await age("Stara", 40);
    await age("Druga", 35);
    // Ola grała 1 na 1 – jej profil ma zostać po usunięciu ligi.
    await profileForMember(db, stara.member, tokens.stara);
    await db.query("insert into events (type, league_id) values ('app_open', $1), ('app_open', $2)", [ids.Stara, ids.Biuro]);
  });
  afterAll(() => db?.end());

  it("lista nieaktywnych: bez gry i treningu od 30 dni, nie nowe ligi", async () => {
    const list = await adminInactiveLeagues(db);
    expect(list.map((l) => l.name)).toEqual(["Stara", "Druga"]);
    expect(list[0]).toMatchObject({ players: 2, games: 1, trainings: 1 });
    expect(list[0].lastGame).not.toBeNull();
  });

  it("trwająca gra albo świeży trening czynią ligę aktywną", async () => {
    const me = await requireMe(db, tokens.druga);
    const players = (await listMembers(db, me.league.id)).map((m) => m.id);
    await publishLiveGame(db, me, { id: "trwa", target: 101, players, turns: [], rev: 1 });
    await db.query("update live_games set updated_at = now() - interval '40 days' where id = 'trwa'");
    expect((await adminInactiveLeagues(db)).map((l) => l.name)).toEqual(["Stara"]);
    await expect(deleteInactiveLeague(db, ids.Druga, "Druga")).rejects.toThrow(/ostatnich 30 dniach/);
    await db.query("delete from live_games where id = 'trwa'");
    expect((await adminInactiveLeagues(db)).map((l) => l.name)).toEqual(["Stara", "Druga"]);
  });

  it("nie usuwa aktywnej ligi, przy złej nazwie ani nieistniejącej", async () => {
    await expect(deleteInactiveLeague(db, ids.Biuro, "Biuro")).rejects.toThrow(/ostatnich 30 dniach/);
    await expect(deleteInactiveLeague(db, ids.Nowa, "Nowa")).rejects.toThrow(/ostatnich 30 dniach/);
    await expect(deleteInactiveLeague(db, ids.Stara, "stara")).rejects.toThrow(/nie zgadza/);
    await expect(deleteInactiveLeague(db, ids.Stara, "")).rejects.toThrow(/nie zgadza/);
    await expect(deleteInactiveLeague(db, ids.Stara, undefined)).rejects.toThrow(/nie zgadza/);
    await expect(deleteInactiveLeague(db, "nie-ma", "Stara")).rejects.toThrow(/Tej ligi już nie ma/);
    expect(await count("select count(*) as n from leagues")).toBe(4);
  });

  it("usuwa tylko wskazaną ligę z jej danymi i zapisuje to w rejestrze", async () => {
    const before = await adminDbSize(db);
    const other = (t: string) => count(`select count(*) as n from ${t} where league_id <> $1`, [ids.Stara]);
    const othersBefore = { members: await other("members"), games: await other("games"), trainings: await other("trainings") };

    expect(await deleteInactiveLeague(db, ids.Stara, "  Stara ")).toEqual({ name: "Stara", members: 2, games: 1, trainings: 1 });

    expect(await count("select count(*) as n from leagues where id = $1", [ids.Stara])).toBe(0);
    expect(await count("select count(*) as n from members where league_id = $1", [ids.Stara])).toBe(0);
    expect(await count("select count(*) as n from games where league_id = $1", [ids.Stara])).toBe(0);
    expect(await count("select count(*) as n from trainings where league_id = $1", [ids.Stara])).toBe(0);
    expect(await count("select count(*) as n from game_results where game_id = 'Stara-g'")).toBe(0);
    await expect(requireMe(db, tokens.stara)).rejects.toThrow();
    // Inne ligi bez zmian.
    expect({ members: await other("members"), games: await other("games"), trainings: await other("trainings") }).toEqual(othersBefore);
    await requireMe(db, tokens.biuro);
    // Profil 1 na 1 zostaje bez powiązania z ligą.
    expect(await count("select count(*) as n from duel_profiles where name = 'Ola' and member_id is null")).toBe(1);

    const log = await adminEvents(db, { leagueId: ids.Stara });
    expect(log.map((e) => e.type)).toEqual(["admin_league_delete"]);
    expect(log[0].detail).toBe("Stara (2 graczy, 1 gra, 1 trening)");
    expect(await count("select count(*) as n from events where league_id = $1", [ids.Biuro])).toBeGreaterThan(0);

    const after = await adminDbSize(db);
    expect(after.tables.find((t) => t.table === "leagues")!.rows).toBe(before.tables.find((t) => t.table === "leagues")!.rows - 1);
    await expect(deleteInactiveLeague(db, ids.Stara, "Stara")).rejects.toThrow(/Tej ligi już nie ma/);
  });

  it("rozmiar bazy: wiersze i wielkość każdej tabeli", async () => {
    const s = await adminDbSize(db);
    expect(s.tables.map((t) => t.table)).toEqual(DB_TABLES.map((t) => t.table));
    expect(s.tables.find((t) => t.table === "leagues")!.rows).toBe(3);
    expect(s.tables.every((t) => t.bytes !== null && t.bytes >= 0)).toBe(true);
    expect(s.totalRows).toBe(s.tables.reduce((a, t) => a + t.rows, 0));
    expect(s.databaseBytes).toBeGreaterThan(0);
    expect(s.eventsSince).not.toBeNull();
  });

  it("rejestr błędów: zapis bez danych, liczba z 24 h i czyszczenie", async () => {
    const e = Object.assign(new Error('duplicate key value violates unique constraint "x"\nDETAIL: Key (name)=(Ania)'), { code: "23505" });
    expect(await recordError(db, { error: e, path: "/api/members/abc123?name=Ania", method: "PATCH", source: "api" })).toBe(true);
    await recordError(db, { error: new Error("stary"), path: "/api/league" });
    await db.query("update server_errors set at = now() - interval '2 days' where message = 'stary'");
    await recordError(db, { error: new Error("bardzo stary") });
    await db.query("update server_errors set at = now() - interval '31 days' where message = 'bardzo stary'");

    let errs = await adminErrors(db);
    expect(errs.last24h).toBe(1);
    expect(errs.last7d).toBe(2);
    expect(errs.recent[0]).toMatchObject({ kind: "Error 23505", path: "/api/members/:id", method: "PATCH", source: "api" });
    expect(JSON.stringify(errs.recent)).not.toContain("Ania");

    await pruneErrors(db);
    errs = await adminErrors(db);
    expect(errs.recent.map((r) => r.message)).not.toContain("bardzo stary");
    expect(errs.recent).toHaveLength(2);
  });

  it("błąd zapisu błędu nie psuje aplikacji", async () => {
    const broken = { query: () => Promise.reject(new Error("brak bazy")) };
    expect(await recordError(broken, { error: new Error("x") })).toBe(false);
  });
});
