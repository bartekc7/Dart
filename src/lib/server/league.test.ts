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
  joinLeague,
  leagueRanking,
  listMembers,
  makeOrganizer,
  newDeviceToken,
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

    await deleteGame(db, me, "g1");
    r = await leagueRanking(db, me.league.id);
    expect(r.games).toBe(0);
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
  });
});
