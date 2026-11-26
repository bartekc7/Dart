import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSchema } from "./db";
import { restoreRemovedResults } from "./repair";
import { deleteTraining, myTrainings, saveTraining } from "./training";
import { startTraining, type AimHit } from "../training";
import {
  addMember,
  claimDevice,
  claimPreview,
  createClaimToken,
  createLeague,
  deleteGame,
  deleteLiveGame,
  joinLeague,
  leagueRanking,
  liveGame,
  liveGames,
  listMembers,
  makeOrganizer,
  newDeviceToken,
  publishLiveGame,
  recentGamesOf,
  requireMe,
  saveGame,
  createRecoveryCode,
  memberStats,
  leagueStats,
  leagueGames,
  removeMember,
  renameMember,
  inactiveMembers,
  clearLeague,
  recoverWithCode,
  setEntryMode,
  whoAmI,
  leagueAchievements,
  setMemberLook,
  takenLooks,
} from "./league";

/**
 * Testy na prawdziwym Postgresie. Uruchom z TEST_DATABASE_URL, np.
 * TEST_DATABASE_URL=postgres://postgres@localhost:5433/dart npm test
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("liga w bazie", () => {
  let db: Pool;
  let ania = newDeviceToken();
  const bartek = newDeviceToken();
  const nowyTelefonAni = newDeviceToken();

  beforeAll(async () => {
    db = new Pool({ connectionString: url });
    await db.query("drop schema public cascade; create schema public;");
    await ensureSchema(db);
    await ensureSchema(db); // drugi raz bez błędu
  });
  afterAll(() => db?.end());

  it("zakładający ligę zostaje organizatorem", async () => {
    await createLeague(db, ania, "Biuro", "Ania");
    const me = await requireMe(db, ania);
    expect(me.league.name).toBe("Biuro");
    expect(me.member).toMatchObject({ name: "Ania", isOrganizer: true });
    expect(me.league.joinCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it("dołączanie po kodzie z nazwą; zajęta nazwa jest odrzucana", async () => {
    const { league } = await requireMe(db, ania);
    await joinLeague(db, bartek, league.joinCode.toLowerCase(), "  Bartek ");
    expect((await requireMe(db, bartek)).member.name).toBe("Bartek");
    await expect(joinLeague(db, newDeviceToken(), league.joinCode, "bartek")).rejects.toThrow(
      /już jest w tej lidze/,
    );
    await expect(joinLeague(db, newDeviceToken(), "ZZZZZZZZ", "X")).rejects.toThrow(/Nie ma ligi/);
    expect(await whoAmI(db, newDeviceToken())).toBeNull();
  });

  it("gracz bez telefonu i przypisanie nowego telefonu przez organizatora", async () => {
    const me = await requireMe(db, ania);
    const celina = await addMember(db, me, "Celina");
    expect(celina.hasDevice).toBe(false);

    const bartekMe = await requireMe(db, bartek);
    await expect(createClaimToken(db, bartekMe, me.member.id)).rejects.toThrow(/organizator/);

    const claim = await createClaimToken(db, me, me.member.id);
    expect(await claimPreview(db, claim)).toEqual({ playerName: "Ania", leagueName: "Biuro" });
    await claimDevice(db, nowyTelefonAni, claim);
    expect((await requireMe(db, nowyTelefonAni)).member.name).toBe("Ania");
    // Drugie urządzenie: stary telefon dalej działa, oba mają uprawnienia organizatora.
    expect((await requireMe(db, nowyTelefonAni)).member.isOrganizer).toBe(true);
    expect((await requireMe(db, ania)).member.name).toBe("Ania");
    // Zwykły gracz może zrobić link tylko dla siebie.
    const bartekDrugi = newDeviceToken();
    await claimDevice(db, bartekDrugi, await createClaimToken(db, bartekMe, bartekMe.member.id));
    expect((await requireMe(db, bartekDrugi)).member.name).toBe("Bartek");
    expect((await requireMe(db, bartek)).member.name).toBe("Bartek");
    await expect(claimDevice(db, newDeviceToken(), claim)).rejects.toThrow(/wygasł albo został już użyty/);
  });

  it("sposób wpisywania punktów zmienia tylko organizator", async () => {
    const me = await requireMe(db, ania);
    expect(me.league.entryMode).toBe("sum");
    await expect(setEntryMode(db, await requireMe(db, bartek), "darts")).rejects.toThrow(/organizator/);
    await expect(setEntryMode(db, me, "xyz")).rejects.toThrow(/Nieznany/);
    await setEntryMode(db, me, "darts");
    expect((await requireMe(db, bartek)).league.entryMode).toBe("darts");
    await setEntryMode(db, me, "sum");
  });

  it("kod odzyskiwania przywraca organizatora na nowym telefonie", async () => {
    const me = await requireMe(db, ania);
    expect(me.league.hasRecoveryCode).toBe(false);
    await expect(createRecoveryCode(db, await requireMe(db, bartek))).rejects.toThrow(/organizator/);
    const stary = await createRecoveryCode(db, me);
    const code = await createRecoveryCode(db, me); // nowy unieważnia stary
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect((await requireMe(db, ania)).league.hasRecoveryCode).toBe(true);

    const nowy = newDeviceToken();
    await expect(recoverWithCode(db, nowy, stary)).rejects.toThrow(/Nieprawidłowy/);
    await recoverWithCode(db, nowy, ` ${code.toLowerCase().replace(/-/g, " ")} `);
    const odzyskany = await requireMe(db, nowy);
    expect(odzyskany.member).toMatchObject({ name: "Ania", isOrganizer: true });
    expect(odzyskany.league.hasRecoveryCode).toBe(false); // kod działa raz
    expect(await whoAmI(db, ania)).toBeNull(); // zgubiony telefon odłączony
    await expect(recoverWithCode(db, newDeviceToken(), code)).rejects.toThrow(/Nieprawidłowy/);
    ania = nowy;
  });

  it("przekazanie roli organizatora", async () => {
    const me = await requireMe(db, ania);
    const bartekId = (await requireMe(db, bartek)).member.id;
    await makeOrganizer(db, me, bartekId);
    const members = await listMembers(db, me.league.id);
    expect(members.filter((m) => m.isOrganizer).map((m) => m.name)).toEqual(["Bartek"]);
    await expect(makeOrganizer(db, await requireMe(db, ania), me.member.id)).rejects.toThrow(/organizator/);
    // Kolory: każdy gracz ligi ma inny numer, w kolejności dołączenia.
    const colors = (await listMembers(db, me.league.id)).map((m) => m.color).sort();
    expect(colors).toEqual(colors.map((_, i) => i));
  });

  it("zapis gry, ranking i usunięcie gry", async () => {
    const me = await requireMe(db, ania);
    const ids = Object.fromEntries((await listMembers(db, me.league.id)).map((m) => [m.name, m.id]));
    const players = [ids.Ania, ids.Bartek, ids.Celina];
    // Ania 101 (1.), Bartek 50, Celina 101 (2.) → Bartek 3.
    const game = { id: "g1", target: 101, players, turns: [101, 50, 101].map((s) => ({ scored: s })) };
    await saveGame(db, me, game);
    await saveGame(db, me, game); // drugi zapis tej samej gry nie dubluje
    let r = await leagueRanking(db, me.league.id);
    expect(r.games).toBe(1);
    expect(r.rows.map((x) => [x.name, x.avgPlace])).toEqual([
      ["Ania", 1],
      ["Celina", 2],
      ["Bartek", 3],
    ]);

    // Czas gry: od pierwszej rzutki do ostatniej serii; stara gra bez czasów ma null.
    const t0 = Date.now() - 600_000;
    await saveGame(db, me, {
      ...game,
      id: "g9",
      startedAt: t0,
      turns: [101, 50, 101].map((s, i) => ({ scored: s, at: t0 + 60_000 * (i + 1) })),
    });
    const timed = await db.query(
      "select id, started_at, ended_at, turns from games where id in ('g1', 'g9') order by id",
    );
    expect(timed.rows[0].started_at).toBeNull();
    expect(timed.rows[0].turns[0].at).toBeUndefined();
    expect(new Date(timed.rows[1].started_at).getTime()).toBe(t0);
    expect(new Date(timed.rows[1].ended_at).getTime()).toBe(t0 + 180_000);
    expect(timed.rows[1].turns.map((t: { at: number }) => t.at - t0)).toEqual([60_000, 120_000, 180_000]);
    const listed = await leagueGames(db, me.league.id);
    expect(listed.find((g) => g.id === "g9")?.durationMs).toBe(180_000);
    expect(listed.find((g) => g.id === "g1")?.durationMs).toBeUndefined();
    // Czas z przyszłości (zły zegar) nie trafia do bazy.
    await saveGame(db, me, { ...game, id: "g9", turns: [101, 50, 101].map((s) => ({ scored: s, at: Date.now() + 86_400_000 })) });
    expect((await db.query("select started_at from games where id = 'g9'")).rows[0].started_at).toBeNull();
    await deleteGame(db, me, "g9");

    await expect(saveGame(db, me, { ...game, id: "g2", turns: [{ scored: 101 }] })).rejects.toThrow(
      /nie jest zakończona/,
    );
    await expect(saveGame(db, me, { ...game, id: "g3", turns: [{ scored: 999 }] })).rejects.toThrow(
      /Nieprawidłowe/,
    );

    // Rzutki: suma musi się zgadzać, a każda wartość być możliwa jedną rzutką.
    const withDarts = (first: number[]) => ({
      ...game,
      id: "g4",
      turns: [{ scored: 101, darts: first }, { scored: 50 }, { scored: 101, darts: [51, 50] }],
    });
    await expect(saveGame(db, me, withDarts([60, 40]))).rejects.toThrow(/Nieprawidłowe/);
    await expect(saveGame(db, me, withDarts([60, 41]))).rejects.toThrow(/Nieprawidłowe/);
    await saveGame(db, me, withDarts([60, 1, 40]));
    const { rows } = await db.query("select turns from games where id = 'g4'");
    expect(rows[0].turns[0].darts).toEqual([60, 1, 40]);
    await deleteGame(db, me, "g4");

    // „Zakończ grę”: Ania kończy, reszta według punktów (Celina 41 zostało, Bartek 71).
    await expect(saveGame(db, me, { ...game, id: "g8", turns: [{ scored: 101 }, { scored: 30 }] })).rejects.toThrow(
      /nie jest zakończona/,
    );
    await saveGame(db, me, { ...game, id: "g8", ended: true, turns: [101, 30, 60].map((s) => ({ scored: s })) });
    const ended = await db.query("select member_id, place from game_results where game_id = 'g8' order by place");
    expect(ended.rows.map((x) => x.member_id)).toEqual([ids.Ania, ids.Celina, ids.Bartek]);
    await expect(saveGame(db, me, { ...game, id: "g9", ended: true, turns: [{ scored: 30 }] })).rejects.toThrow(
      /Nieprawidłowe/,
    );
    // Karta gracza: g1 (Bartek 3., seria 50) + g8 (Bartek 3., seria 30).
    const bartekStats = await memberStats(db, me.league.id, ids.Bartek);
    expect(bartekStats).toMatchObject({ name: "Bartek", games: 2, wins: 0, avgPlace: 3, series: 2, bestSeries: 50, busts: 0 });
    expect(bartekStats.avgPerSeries).toBe(40);
    expect(bartekStats.recent.map((g) => g.id)).toEqual(["g8", "g1"]);
    expect((await memberStats(db, me.league.id, ids.Ania)).wins).toBe(2);
    await expect(memberStats(db, me.league.id, "obcy")).rejects.toThrow(/Nie ma takiego gracza/);
    // Historia: obie gry od najnowszej. Usunąć może zapisujący albo organizator, nie inny gracz.
    expect((await leagueGames(db, me.league.id)).map((g) => g.id)).toEqual(["g8", "g1"]);
    const celinaTel = newDeviceToken();
    await claimDevice(db, celinaTel, await createClaimToken(db, await requireMe(db, bartek), ids.Celina));
    await expect(deleteGame(db, await requireMe(db, celinaTel), "g8")).rejects.toThrow(/tylko organizator/);
    await deleteGame(db, me, "g8");

    await deleteGame(db, await requireMe(db, bartek), "g1"); // Bartek jest organizatorem
    r = await leagueRanking(db, me.league.id);
    expect(r.games).toBe(0);
  });

  it("ostatnie gry gracza z miejscem", async () => {
    const me = await requireMe(db, ania);
    const ids = Object.fromEntries((await listMembers(db, me.league.id)).map((m) => [m.name, m.id]));
    await saveGame(db, me, { id: "h1", target: 101, players: [ids.Bartek, ids.Ania], turns: [{ scored: 101 }] });
    const mine = await recentGamesOf(db, ids.Ania);
    expect(mine).toMatchObject([{ id: "h1", place: 2, players: 2, target: 101 }]);
  });

  it("gra na żywo: stan widzi cała liga, starsza wersja nie nadpisuje nowszej", async () => {
    const me = await requireMe(db, ania);
    const viewer = await requireMe(db, bartek);
    const ids = Object.fromEntries((await listMembers(db, me.league.id)).map((m) => [m.name, m.id]));
    const base = { id: "live1", target: 101, players: [ids.Ania, ids.Bartek] };

    await publishLiveGame(db, me, { ...base, turns: [], rev: 1 });
    await publishLiveGame(db, me, { ...base, turns: [{ scored: 40 }], rev: 3 });
    expect((await publishLiveGame(db, me, { ...base, turns: [], rev: 2 })).updated).toBe(false);

    const [g] = await liveGames(db, viewer.league.id);
    expect(g).toMatchObject({ id: "live1", finished: false, scorer: { name: "Ania" } });
    expect(g.state.turns).toHaveLength(1);
    expect(g.state.players.map((p) => p.name)).toEqual(["Ania", "Bartek"]);

    await publishLiveGame(db, me, { ...base, turns: [40, 101].map((s) => ({ scored: s })), rev: 4 });
    expect((await liveGame(db, viewer.league.id, "live1"))?.finished).toBe(true);

    await expect(
      publishLiveGame(db, me, { ...base, turns: [{ scored: 999 }], rev: 5 }),
    ).rejects.toThrow(/Nieprawidłowe/);

    await deleteLiveGame(db, me, "live1");
    expect(await liveGames(db, me.league.id)).toEqual([]);
  });

  it("inna liga nie widzi ani nie zapisuje gier cudzej ligi", async () => {
    const obcy = newDeviceToken();
    await createLeague(db, obcy, "Inna", "Obcy");
    const other = await requireMe(db, obcy);
    const me = await requireMe(db, ania);
    const ids = (await listMembers(db, me.league.id)).map((m) => m.id);
    await expect(
      saveGame(db, other, { id: "x", target: 101, players: [ids[0]], turns: [{ scored: 101 }] }),
    ).rejects.toThrow(/spoza ligi/);
    expect(await liveGame(db, other.league.id, "live1")).toBeNull();
    await expect(
      publishLiveGame(db, other, { id: "y", target: 101, players: [ids[0]], turns: [], rev: 1 }),
    ).rejects.toThrow(/spoza ligi/);
  });
  it("usuwanie gracza i czyszczenie ligi (organizator)", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Czyszczenie", "Org");
    const me = await requireMe(db, org);
    const t1 = newDeviceToken();
    await joinLeague(db, t1, me.league.joinCode, "Gracz1");
    await addMember(db, me, "Gracz2");
    const ids = Object.fromEntries((await listMembers(db, me.league.id)).map((m) => [m.name, m.id]));
    const players = [ids.Org, ids.Gracz1, ids.Gracz2];
    await saveGame(db, me, { id: "c1", target: 101, players, turns: [101, 50, 101].map((x) => ({ scored: x })) });

    await expect(removeMember(db, await requireMe(db, t1), ids.Gracz2)).rejects.toThrow(/organizator/);
    await expect(removeMember(db, me, ids.Org)).rejects.toThrow(/siebie/);
    await removeMember(db, me, ids.Gracz1);
    expect(await whoAmI(db, t1)).toBeNull(); // telefon odłączony
    expect((await listMembers(db, me.league.id)).map((m) => m.name).sort()).toEqual(["Gracz2", "Org"]);
    // Gracz z grami jest tylko dezaktywowany: ranking, historia i karta zostają.
    const ranking = await leagueRanking(db, me.league.id);
    expect(ranking.games).toBe(1);
    expect(ranking.rows.map((r) => r.name).sort()).toEqual(["Gracz1", "Gracz2", "Org"]);
    expect((await leagueGames(db, me.league.id))[0].results).toHaveLength(3);
    expect((await memberStats(db, me.league.id, ids.Gracz1)).games).toBe(1);
    await expect(createClaimToken(db, me, ids.Gracz1)).rejects.toThrow(/Nie ma takiego gracza/);
    // Gracz bez gier znika całkiem.
    const bez = await addMember(db, me, "Bez gier");
    await removeMember(db, me, bez.id);
    expect((await db.query("select 1 from members where id = $1", [bez.id])).rowCount).toBe(0);
    // Ponowne dodanie tej samej nazwy przywraca gracza razem z wynikami.
    expect((await addMember(db, me, "gracz1")).id).toBe(ids.Gracz1);
    await removeMember(db, me, ids.Gracz1);

    await expect(clearLeague(db, me, "games", "zła nazwa")).rejects.toThrow(/nazwę ligi/);
    await clearLeague(db, me, "games", " czyszczenie ");
    expect(await leagueGames(db, me.league.id)).toEqual([]);
    expect(await listMembers(db, me.league.id)).toHaveLength(2);
    await clearLeague(db, me, "all", "Czyszczenie");
    expect((await listMembers(db, me.league.id)).map((m) => m.name)).toEqual(["Org"]);
  });

  it("karta gracza liczy trafienia w pola tarczy", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Tarcza", "Ola");
    const me = await requireMe(db, org);
    const kuba = await addMember(db, me, "Kuba");
    const players = [me.member.id, kuba.id];
    const turns = [
      { scored: 81, darts: [60, 16, 5], fields: ["T20", "D8", "5"] },
      { scored: 101 },
    ];
    await saveGame(db, me, { id: "tarcza1", target: 101, players, turns });
    const ola = await memberStats(db, me.league.id, me.member.id);
    expect(ola.hits).toEqual({ T20: 1, D8: 1, "5": 1 });
    expect(ola.hitGames).toBe(1);
    expect((await memberStats(db, me.league.id, kuba.id)).hits).toEqual({});

    // Statystyki ligi: ta sama gra, plus czas gry, gdy baza ma kolumny started_at/ended_at.
    const liga = await leagueStats(db, me.league.id);
    expect(liga).toMatchObject({ games: 1, series: 2, hits: { T20: 1, D8: 1, "5": 1 }, durations: null });
    expect(liga.records.fastestWin).toMatchObject({ memberId: kuba.id, value: 1 });
    await db.query("alter table games add column if not exists started_at timestamptz, add column if not exists ended_at timestamptz");
    await db.query("update games set started_at = now() - interval '7 minutes', ended_at = now() where id = 'tarcza1'");
    expect((await leagueStats(db, me.league.id)).durations).toMatchObject({ games: 1, avgMs: 7 * 60_000 });
  });

  it("osiągnięcia z historii gier; trwającą grę można pominąć", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Osiągnięcia", "Ola");
    const me = await requireMe(db, org);
    const kuba = await addMember(db, me, "Kuba");
    const players = [me.member.id, kuba.id];
    await saveGame(db, me, { id: "os1", target: 101, players, turns: [60, 20, 41].map((x) => ({ scored: x })) });
    await saveGame(db, me, { id: "os2", target: 101, players, turns: [101].map((x) => ({ scored: x })) });
    const { members: all, records } = await leagueAchievements(db, me.league.id);
    expect(records.personal[me.member.id].series).toMatchObject({ value: 101 });
    expect(records.league["fastest:101"]).toMatchObject({ memberId: me.member.id, value: 1 });
    expect(all[me.member.id]).toMatchObject({ games: 2, wins: 2, winStreak: 2, points: 202 });
    expect(Object.keys(all[me.member.id].unlocked).map(Number)).toEqual(expect.arrayContaining([3, 9, 10, 17, 22, 30, 49]));
    expect(all[kuba.id].unlocked[4]).toMatchObject({ gameId: "os1" });
    const { members: without } = await leagueAchievements(db, me.league.id, "os2");
    expect(without[me.member.id]).toMatchObject({ games: 1, wins: 1 });
    expect(without[me.member.id].unlocked[10]).toBeUndefined();
  });

  it("naprawa: odtwarza wyniki gracza skasowanego starym „Usuń gracza”", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Naprawa", "Szef");
    const me = await requireMe(db, org);
    const ola = await addMember(db, me, "Ola");
    const kuba = await addMember(db, me, "Kuba");
    const players = [me.member.id, ola.id, kuba.id];
    // Ola kończy pierwsza, Szef drugi, Kuba trzeci.
    const turns = [10, 101, 20, 91].map((x) => ({ scored: x }));
    await publishLiveGame(db, me, { id: "n1", target: 101, players, turns, rev: 1 });
    await saveGame(db, me, { id: "n1", target: 101, players, turns });
    // n2: Kuba nie zdążył rzucić, więc jest tylko w podglądzie na żywo.
    const n2 = { id: "n2", target: 101, players: [me.member.id, kuba.id], turns: [{ scored: 101 }] };
    await publishLiveGame(db, me, { ...n2, rev: 1 });
    await saveGame(db, me, n2);
    // Stare zachowanie: twarde usunięcie kasuje wyniki.
    await db.query("delete from members where id = any($1)", [[ola.id, kuba.id]]);
    expect((await leagueRanking(db, me.league.id)).games).toBe(0); // tak zniknął ranking

    await restoreRemovedResults(db);
    await restoreRemovedResults(db); // drugi raz nic nie zmienia
    const games = await leagueGames(db, me.league.id);
    const n1 = games.find((g) => g.id === "n1")!;
    expect(n1.results.map((r) => [r.name, r.place])).toEqual([["Ola", 1], ["Szef", 2], ["Kuba", 3]]);
    expect(games.find((g) => g.id === "n2")!.results).toHaveLength(2);
    expect((await leagueRanking(db, me.league.id)).games).toBe(2);
    // Przywróceni są nieaktywni.
    expect((await listMembers(db, me.league.id)).map((m) => m.name)).toEqual(["Szef"]);
  });

  it("zmiana nazwy: swoja albo przez organizatora, bez powtórek (także z nieaktywnymi)", async () => {
    const org = newDeviceToken();
    const gracz = newDeviceToken();
    await createLeague(db, org, "Nazwy", "Szef");
    const me = await requireMe(db, org);
    await joinLeague(db, gracz, me.league.joinCode, "Ola");
    const ola = await requireMe(db, gracz);
    const kuba = await addMember(db, me, "Kuba");
    const zenek = await addMember(db, me, "Zenek");
    const players = [me.member.id, ola.member.id, zenek.id];
    const turns = [101, 101].map((x) => ({ scored: x }));
    await saveGame(db, me, { id: "nz1", target: 101, players, turns });
    await removeMember(db, me, zenek.id);

    // Gracz zmienia swoją nazwę; ranking i historia od razu pokazują nową.
    expect((await renameMember(db, ola, ola.member.id, "  Ola  K. ")).name).toBe("Ola K.");
    expect((await requireMe(db, gracz)).member.name).toBe("Ola K.");
    const game = (await leagueGames(db, me.league.id)).find((g) => g.id === "nz1")!;
    expect(game.results.map((r) => r.name)).toContain("Ola K.");
    // Sama zmiana wielkości liter jest dozwolona.
    expect((await renameMember(db, ola, ola.member.id, "ola k.")).name).toBe("ola k.");

    // Zwykły gracz nie zmieni nazwy innym; organizator tak.
    await expect(renameMember(db, ola, kuba.id, "Jakub")).rejects.toThrow(/organizator/);
    expect((await renameMember(db, me, kuba.id, "Jakub")).name).toBe("Jakub");

    // Nazwy nie mogą się powtarzać – bez względu na wielkość liter, także z nieaktywnymi.
    await expect(renameMember(db, ola, ola.member.id, "SZEF")).rejects.toThrow(/jest już gracz/);
    await expect(renameMember(db, ola, ola.member.id, "zenek")).rejects.toThrow(/nieaktywnego/);
    await expect(renameMember(db, ola, ola.member.id, "  ")).rejects.toThrow(/Podaj nazwę/);
    // Nieaktywnego nie da się przemianować; zachowuje starą nazwę.
    await expect(renameMember(db, me, zenek.id, "Zenon")).rejects.toThrow(/Nie ma takiego gracza/);
    const inactive = await inactiveMembers(db, me.league.id);
    expect(inactive.map((m) => [m.name, m.active])).toEqual([["Zenek", false]]);
    // Nieaktywny nie może wziąć udziału w nowej grze.
    await expect(
      saveGame(db, me, { id: "nz2", target: 101, players: [me.member.id, zenek.id], turns }),
    ).rejects.toThrow(/spoza ligi/);
  });

  it("treningi solo: zapis z przeliczeniem wyniku, tylko własne, osobno od gier", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Treningi", "Ola");
    const me = await requireMe(db, org);
    const kubaToken = newDeviceToken();
    await joinLeague(db, kubaToken, (await requireMe(db, org)).league.joinCode, "Kuba");
    const kuba = await requireMe(db, kubaToken);

    const aim = { ...startTraining("aim", "20"), darts: Array.from({ length: 30 }, (_, i): AimHit => (i < 12 ? "T" : "0")) };
    await saveTraining(db, me, { id: "tr1", data: { ...aim, score: 999 } });
    await saveTraining(db, me, { id: "tr1", data: aim }); // ponowny zapis nie dubluje
    const mine = await myTrainings(db, me);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: "tr1", mode: "aim", variant: "20", score: 40 });
    expect(await myTrainings(db, kuba)).toEqual([]);
    await expect(saveTraining(db, kuba, { id: "tr1", data: aim })).rejects.toThrow(/Nie można/);

    await expect(saveTraining(db, me, { id: "tr2", data: startTraining("clock") })).rejects.toThrow(/nie jest zakończony/);
    await expect(
      saveTraining(db, me, { id: "tr3", data: { ...startTraining("aim", "25"), darts: Array(30).fill("T") } }),
    ).rejects.toThrow(/rzutka/);

    // Treningi nie są grami: ranking, statystyki i osiągnięcia ligi ich nie widzą.
    expect((await leagueStats(db, me.league.id)).games).toBe(0);
    expect((await leagueAchievements(db, me.league.id)).members).toEqual({});

    await deleteTraining(db, kuba, "tr1"); // cudzego nie usunie
    expect(await myTrainings(db, me)).toHaveLength(1);
    await deleteTraining(db, me, "tr1");
    expect(await myTrainings(db, me)).toEqual([]);
  });

  it("kolor albo ikonka: wybór przy dołączaniu, unikalne w lidze, zmiana później", async () => {
    const org = newDeviceToken();
    await createLeague(db, org, "Znaki", "Ola", "icon:☕");
    const me = await requireMe(db, org);
    expect(me.member).toMatchObject({ icon: "☕", color: -1 });
    const code = me.league.joinCode;

    // Bez wyboru: pierwszy wolny kolor wg kolejności (Ola ma ikonkę, więc kolor 1 jest wolny).
    const kubaToken = newDeviceToken();
    await joinLeague(db, kubaToken, code, "Kuba");
    expect((await requireMe(db, kubaToken)).member).toMatchObject({ color: 1, icon: null });

    await expect(joinLeague(db, newDeviceToken(), code, "Ewa", "icon:☕")).rejects.toThrow(/ikonkę ma już/);
    await expect(joinLeague(db, newDeviceToken(), code, "Ewa", "color:1")).rejects.toThrow(/kolor ma już/);
    await expect(joinLeague(db, newDeviceToken(), code, "Ewa", "icon:🍎")).rejects.toThrow(/Nieznany/);
    const ewa = await addMember(db, me, "Ewa", "icon:🐛");
    expect(ewa).toMatchObject({ icon: "🐛", color: -1 });
    expect((await takenLooks(db, me.league.id)).sort()).toEqual(["color:1", "icon:☕", "icon:🐛"].sort());

    // Zmiana później: swój znak każdy, cudzy tylko organizator; zajęty odrzucany.
    const kuba = await requireMe(db, kubaToken);
    await expect(setMemberLook(db, kuba, kuba.member.id, "icon:🐛")).rejects.toThrow(/ikonkę ma już/);
    expect(await setMemberLook(db, kuba, kuba.member.id, "icon:🦆")).toMatchObject({ icon: "🦆", color: -1 });
    await expect(setMemberLook(db, kuba, ewa.id, "color:5")).rejects.toThrow(/organizator/);
    expect(await setMemberLook(db, me, ewa.id, "color:5")).toMatchObject({ icon: null, color: 5 });
    expect(await setMemberLook(db, me, me.member.id, "color:1")).toMatchObject({ icon: null, color: 1 });
  });

  it("migracja: obecni gracze dostają na stałe dotychczasowy kolor", async () => {
    const t = newDeviceToken();
    await createLeague(db, t, "Stara", "A");
    const me = await requireMe(db, t);
    await addMember(db, me, "B");
    await addMember(db, me, "C");
    // Jak przed zmianą: brak zapisanego znaku.
    await db.query("update members set color_idx = null, icon = null where league_id = $1", [me.league.id]);
    const before = (await listMembers(db, me.league.id)).map((m) => [m.name, m.color]);
    await ensureSchema(db);
    const { rows } = await db.query("select name, color_idx from members where league_id = $1 order by name", [me.league.id]);
    expect(rows.map((r) => [r.name, r.color_idx])).toEqual([...before].sort());
    expect((await listMembers(db, me.league.id)).map((m) => [m.name, m.color])).toEqual(before);
  });
});
