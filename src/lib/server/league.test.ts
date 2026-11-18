import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSchema } from "./db";
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
  whoAmI,
} from "./league";

/**
 * Testy na prawdziwym Postgresie. Uruchom z TEST_DATABASE_URL, np.
 * TEST_DATABASE_URL=postgres://postgres@localhost:5433/dart npm test
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("liga w bazie", () => {
  let db: Pool;
  const ania = newDeviceToken();
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
    await expect(claimDevice(db, newDeviceToken(), claim)).rejects.toThrow(/wygasł albo został już użyty/);
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

    await deleteGame(db, me, "g1");
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
});
