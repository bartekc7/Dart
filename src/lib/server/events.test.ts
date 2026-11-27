import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSchema } from "./db";
import { adminEvents, adminLeagues, adminMembers, adminSummary } from "./admin";
import { createGuestProfile } from "./duels";
import { deviceTag, logEvent, pruneEvents } from "./events";
import {
  createLeague,
  deleteLiveGame,
  joinLeague,
  listMembers,
  newDeviceToken,
  publishLiveGame,
  removeMember,
  requireMe,
  saveGame,
} from "./league";
import { saveTraining } from "./training";
import { startTraining, addAim } from "../training";

/** Testy na prawdziwym Postgresie (TEST_DATABASE_URL), we własnym schemacie. */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("rejestr zdarzeń i panel admina", () => {
  let db: Pool;
  const ania = newDeviceToken();
  const bartek = newDeviceToken();
  const gosc = newDeviceToken();

  beforeAll(async () => {
    db = new Pool({ connectionString: url, options: "-c search_path=events_test" });
    await db.query("drop schema if exists events_test cascade; create schema events_test;");
    await ensureSchema(db);
    await ensureSchema(db);
    await createLeague(db, ania, "Biuro", "Ania");
    const { league } = await requireMe(db, ania);
    await joinLeague(db, bartek, league.joinCode, "Bartek");
  });
  afterAll(() => db?.end());

  it("zapisuje kto (liga, gracz, telefon), co i kiedy – bez wyników", async () => {
    const me = await requireMe(db, ania);
    expect(await logEvent(db, { type: "game_end", token: ania })).toBe(true);
    const { rows } = await db.query("select * from events where type = 'game_end'");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ member_id: me.member.id, league_id: me.league.id, device: deviceTag(ania) });
    expect(Object.keys(rows[0]).sort()).toEqual(["at", "device", "id", "league_id", "member_id", "profile_id", "type"]);
  });

  it("wejście do aplikacji liczy się raz na pół godziny z jednego telefonu", async () => {
    expect(await logEvent(db, { type: "app_open", token: bartek })).toBe(true);
    expect(await logEvent(db, { type: "app_open", token: bartek })).toBe(false);
    expect(await logEvent(db, { type: "app_open", token: ania })).toBe(true);
    await db.query("update events set at = now() - interval '31 minutes' where type = 'app_open'");
    expect(await logEvent(db, { type: "app_open", token: bartek })).toBe(true);
    // Inne zdarzenia nie są ograniczane.
    expect(await logEvent(db, { type: "game_start", token: bartek })).toBe(true);
    expect(await logEvent(db, { type: "game_start", token: bartek })).toBe(true);
  });

  it("gość 1 na 1 jest rozpoznawany po swoim telefonie; nieznany telefon zostaje anonimowy", async () => {
    const profile = await createGuestProfile(db, gosc, "Marek");
    expect(await logEvent(db, { type: "duel_start", token: gosc })).toBe(true);
    const [e] = await adminEvents(db);
    expect(e).toMatchObject({ type: "duel_start", who: "Marek", guest: true, leagueId: null });
    const { rows } = await db.query("select profile_id from events where id = $1", [e.id]);
    expect(rows[0].profile_id).toBe(profile.id);

    expect(await logEvent(db, { type: "app_open", token: newDeviceToken() })).toBe(true);
    const [anon] = await adminEvents(db);
    expect(anon).toMatchObject({ who: null, memberId: null, leagueId: null });
    expect(anon.device).toHaveLength(10);
    expect(await logEvent(db, { type: "app_open" })).toBe(false);
  });

  it("błąd bazy nie przerywa działania aplikacji", async () => {
    const broken = { query: async () => Promise.reject(new Error("baza leży")) };
    await expect(logEvent(broken, { type: "game_end", token: ania })).resolves.toBe(false);
    await expect(pruneEvents(broken)).resolves.toBeUndefined();
  });

  it("filtr po lidze i graczu", async () => {
    const me = await requireMe(db, ania);
    const all = await adminEvents(db);
    const league = await adminEvents(db, { leagueId: me.league.id });
    const onlyAnia = await adminEvents(db, { leagueId: me.league.id, memberId: me.member.id });
    expect(league.length).toBeLessThan(all.length);
    expect(league.every((e) => e.leagueId === me.league.id && e.leagueName === "Biuro")).toBe(true);
    expect(onlyAnia.length).toBeGreaterThan(0);
    expect(onlyAnia.every((e) => e.memberId === me.member.id && e.who === "Ania")).toBe(true);
    expect(await adminEvents(db, { leagueId: "nie-ma" })).toEqual([]);
  });

  it("wpisy starsze niż 90 dni kasują się same", async () => {
    await db.query("insert into events (type, device, at) values ('app_open', 'stary', now() - interval '91 days'), ('app_open', 'swiezy', now() - interval '89 days')");
    await pruneEvents(db);
    const { rows } = await db.query("select device from events where device in ('stary', 'swiezy')");
    expect(rows.map((r) => r.device)).toEqual(["swiezy"]);
  });

  it("start, koniec i anulowanie gry rozpoznaje serwer", async () => {
    const me = await requireMe(db, ania);
    const ids = Object.fromEntries((await listMembers(db, me.league.id)).map((m) => [m.name, m.id]));
    const base = { target: 101, players: [ids.Ania, ids.Bartek] };
    expect((await publishLiveGame(db, me, { ...base, id: "g1", turns: [], rev: 1 })).created).toBe(true);
    expect((await publishLiveGame(db, me, { ...base, id: "g1", turns: [{ scored: 40 }], rev: 2 })).created).toBe(false);
    expect(await deleteLiveGame(db, me, "g1")).toEqual({ cancelled: true });
    expect(await deleteLiveGame(db, me, "g1")).toEqual({ cancelled: false });

    await publishLiveGame(db, me, { ...base, id: "g2", turns: [{ scored: 101 }], rev: 1 });
    expect(await deleteLiveGame(db, me, "g2")).toEqual({ cancelled: false }); // zakończona – to nie anulowanie

    const game = { ...base, id: "g3", turns: [{ scored: 101 }] };
    expect(await saveGame(db, me, game)).toEqual({ created: true });
    expect(await saveGame(db, me, game)).toEqual({ created: false }); // poprawka tej samej gry

    let t = startTraining("aim", "20");
    for (let i = 0; i < 30; i++) t = addAim(t, "S");
    expect(await saveTraining(db, me, { id: "t1", data: t })).toEqual({ created: true });
    expect(await saveTraining(db, me, { id: "t1", data: t })).toEqual({ created: false });
  });

  it("ligi i gracze: liczby, organizator, usunięty, ostatnia aktywność", async () => {
    const me = await requireMe(db, ania);
    await joinLeague(db, newDeviceToken(), me.league.joinCode, "Celina");
    const celina = (await listMembers(db, me.league.id)).find((m) => m.name === "Celina")!;
    await removeMember(db, me, celina.id);
    await createLeague(db, newDeviceToken(), "Pusta", "Zenek");

    const leagues = await adminLeagues(db);
    // Najświeższa aktywność pierwsza: „Pusta” właśnie powstała.
    expect(leagues.map((l) => l.name)).toEqual(["Pusta", "Biuro"]);
    const biuro = leagues.find((l) => l.name === "Biuro")!;
    expect(biuro).toMatchObject({ players: 2, games: 1 });
    expect(biuro.lastActive).not.toBeNull();

    const members = await adminMembers(db, me.league.id);
    expect(members.map((m) => [m.name, m.isOrganizer, m.active])).toEqual([
      ["Ania", true, true],
      ["Bartek", false, true],
    ]);
    expect(members[0].devices).toBe(1);
    expect(members[0].lastActive).not.toBeNull();
  });

  it("podsumowanie: aktywni dziś i w tygodniu, gry i treningi dziennie", async () => {
    const s = await adminSummary(db);
    expect(s.activeToday).toBeGreaterThanOrEqual(3); // Ania, Bartek, gość (+ telefony)
    expect(s.activeWeek).toBeGreaterThanOrEqual(s.activeToday);
    expect(s.days).toHaveLength(14);
    const today = s.days[13];
    expect(today.games).toBe(1);
    expect(today.trainings).toBe(1);
    expect(s.eventsToday).toBeGreaterThan(0);
  });
});
