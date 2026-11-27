import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSchema } from "./db";
import { createLeague, joinLeague, memberStats, newDeviceToken, requireMe, setMemberLook } from "./league";
import {
  acceptByCode,
  acceptDuel,
  cancelDuel,
  createDuel,
  declineDuel,
  duelsMe,
  getDuel,
  invitePreview,
  myProfile,
  opponents,
  rematchDuel,
  rivalSummary,
  duelSummary,
  requireProfile,
  setDuelLive,
  submitDuelTurn,
  undoDuelTurn,
} from "./duels";

/** Testy na prawdziwym Postgresie (TEST_DATABASE_URL), jak testy ligi. */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("gry 1 na 1 w bazie", () => {
  let db: Pool;
  const ania = newDeviceToken();
  const bartek = newDeviceToken();
  const gosc = newDeviceToken();
  const obcy = newDeviceToken();

  beforeAll(async () => {
    // Własny schemat, żeby nie przeszkadzać testom ligi, które biegną równolegle na tej samej bazie.
    db = new Pool({ connectionString: url, options: "-c search_path=duels_test" });
    await db.query("drop schema if exists duels_test cascade; create schema duels_test;");
    await ensureSchema(db);
    await ensureSchema(db);
    await createLeague(db, ania, "Biuro", "Ania");
    const { league } = await requireMe(db, ania);
    await joinLeague(db, bartek, league.joinCode, "Bartek");
  });
  afterAll(() => db?.end());

  it("gracz ligi ma profil z nazwą i znakiem z ligi; obcy telefon nie ma profilu", async () => {
    const p = await requireProfile(db, ania);
    expect(p).toMatchObject({ name: "Ania", color: 0, icon: null });
    expect((await requireProfile(db, ania)).id).toBe(p.id);
    expect(await myProfile(db, obcy)).toBeNull();
    expect((await duelsMe(db, obcy)).profile).toBeNull();
    // Zmiana znaku w lidze zmienia go też w 1 na 1.
    const me = await requireMe(db, ania);
    await setMemberLook(db, me, me.member.id, "icon:🐛");
    expect(await requireProfile(db, ania)).toMatchObject({ icon: "🐛", color: -1 });
  });

  it("lista rywali: gracze z mojej ligi", async () => {
    const list = await opponents(db, ania);
    expect(list.map((o) => o.name)).toEqual(["Bartek"]);
    expect(list[0]).toMatchObject({ inLeague: true, won: 0, lost: 0 });
  });

  it("zaproszenie w aplikacji: rywal widzi je i może odrzucić", async () => {
    const [b] = await opponents(db, ania);
    const { id } = await createDuel(db, ania, { target: 101, starter: "me", rivalId: b.id });
    const inc = (await duelsMe(db, bartek)).incoming!;
    expect(inc).toMatchObject({ id, status: "pending", target: 101, inviteCode: null });
    expect(inc.inviter.name).toBe("Ania");
    expect((await duelsMe(db, ania)).outgoing).toEqual({ id });
    await declineDuel(db, bartek, id);
    expect((await duelsMe(db, bartek)).incoming).toBeNull();
    expect((await getDuel(db, await requireProfile(db, ania), id)).status).toBe("declined");
  });

  it("zły cel albo brak wyboru zaczynającego jest odrzucany", async () => {
    await expect(createDuel(db, ania, { target: 150, starter: "me" })).rejects.toThrow(/do ilu/);
    await expect(createDuel(db, ania, { target: 101 })).rejects.toThrow(/kto zaczyna/);
    await expect(createDuel(db, obcy, { target: 101, starter: "me" })).rejects.toThrow(/nazwę/);
  });

  it("gra: serię wpisuje tylko gracz z kolejką; koniec, gdy ktoś zejdzie do 0", async () => {
    const [b] = await opponents(db, ania);
    const { id } = await createDuel(db, ania, { target: 101, starter: "rival", rivalId: b.id });
    let duel = await acceptDuel(db, bartek, id);
    expect(duel.status).toBe("active");
    expect(duel.state!.players.map((p) => p.name)).toEqual(["Bartek", "Ania"]);
    await expect(submitDuelTurn(db, ania, id, { scored: 60 })).rejects.toThrow(/Teraz rzuca Bartek/);

    // Rzutki na żywo widzi rywal; cofnąć serię można, dopóki rywal nie zacznie swojej.
    duel = await submitDuelTurn(db, bartek, id, { scored: 60, darts: [60], fields: ["T20"] });
    expect(duel.state!.turns).toHaveLength(1);
    await setDuelLive(db, ania, id, { rev: duel.rev, darts: [20], labels: ["20"] });
    const seen = await getDuel(db, await requireProfile(db, bartek), id);
    expect(seen.live).toEqual({ playerId: (await requireProfile(db, ania)).id, darts: [20], labels: ["20"] });
    await expect(undoDuelTurn(db, bartek, id)).rejects.toThrow(/Rywal już wpisuje/);
    await setDuelLive(db, ania, id, { rev: duel.rev, darts: [], labels: [] });
    const undone = await undoDuelTurn(db, bartek, id);
    expect(undone.turn.scored).toBe(60);
    expect(undone.duel.state!.turns).toHaveLength(0);

    await submitDuelTurn(db, bartek, id, { scored: 60 });
    await submitDuelTurn(db, ania, id, { scored: 100 });
    await expect(submitDuelTurn(db, ania, id, { scored: 1 })).rejects.toThrow(/Teraz rzuca Bartek/);
    duel = await submitDuelTurn(db, bartek, id, { scored: 41 });
    expect(duel.status).toBe("finished");
    expect(duel.winnerId).toBe(b.id);
    expect(duel.balance[b.id]).toBe(1);

    // Pomyłka przy serii kończącej: zwycięzca może ją jeszcze cofnąć.
    const back = await undoDuelTurn(db, bartek, id);
    expect(back.duel.status).toBe("active");
    duel = await submitDuelTurn(db, bartek, id, { scored: 41 });
    expect(duel.status).toBe("finished");

    const list = await opponents(db, ania);
    expect(list[0]).toMatchObject({ name: "Bartek", won: 0, lost: 1 });
  });

  it("rewanż: zaproszenie dla tego samego rywala, zaczyna przegrany", async () => {
    const { rows } = await db.query("select id from duels where status = 'finished'");
    const old = rows[0].id;
    const { id } = await rematchDuel(db, bartek, old);
    expect((await rematchDuel(db, ania, old)).id).toBe(id);
    const duel = await acceptDuel(db, ania, id);
    expect(duel.state!.players[0].name).toBe("Ania");
    // Trwa gra: nowego zaproszenia nie da się wysłać.
    await expect(createDuel(db, ania, { target: 101, starter: "me" })).rejects.toThrow(/dokończ/);
    await cancelDuel(db, bartek, id);
    expect((await getDuel(db, await requireProfile(db, ania), id)).status).toBe("cancelled");
  });

  it("link dla nowej osoby: podaje nazwę i od razu gra; potem jest na liście rywali", async () => {
    const { id } = await createDuel(db, ania, { target: 201, starter: "me" });
    const duel = await getDuel(db, await requireProfile(db, ania), id);
    const code = duel.inviteCode!;
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(await invitePreview(db, gosc, code)).toMatchObject({ valid: true, profile: null, target: 201, inviter: { name: "Ania" } });
    await expect(acceptByCode(db, ania, code, {})).rejects.toThrow(/Twoje zaproszenie/);
    await expect(acceptByCode(db, gosc, code, {})).rejects.toThrow(/Podaj nazwę/);
    await acceptByCode(db, gosc, code.toLowerCase(), { name: "Marek", look: "color:3" });
    expect(await requireProfile(db, gosc)).toMatchObject({ name: "Marek", color: 3 });
    expect((await invitePreview(db, obcy, code)).valid).toBe(false);
    expect((await duelsMe(db, gosc)).active?.id).toBe(id);
    await cancelDuel(db, gosc, id);
  });

  it("zaproszenie wygasa po 10 minutach", async () => {
    const [b] = (await opponents(db, ania)).filter((o) => o.name === "Bartek");
    const { id } = await createDuel(db, ania, { target: 101, starter: "me", rivalId: b.id });
    await db.query("update duels set created_at = now() - interval '11 minutes' where id = $1", [id]);
    expect((await duelsMe(db, bartek)).incoming).toBeNull();
    await expect(acceptDuel(db, bartek, id)).rejects.toThrow(/nieaktualne/);
  });

  it("gry 1 na 1 widzą tylko ich gracze", async () => {
    const { rows } = await db.query("select id from duels where target = 101 order by created_at limit 1");
    await expect(getDuel(db, await requireProfile(db, gosc), rows[0].id)).rejects.toThrow(/Nie ma takiej gry/);
  });

  it("ekran 1 na 1: mój bilans i rekordy; Ty vs rywal tylko dla znanych rywali", async () => {
    const sum = await duelSummary(db, ania);
    expect(sum.totals).toMatchObject({ games: 1, won: 0, lost: 1 });
    expect(sum.records.personal[sum.profile.id].series.value).toBe(100);
    // Forma: gracz ligi ma ją na karcie gracza (gra 1 na 1 się liczy), gość – tutaj.
    expect(sum.form).toBeNull();
    const me = await requireMe(db, ania);
    expect((await memberStats(db, me.league.id, me.member.id)).form).toEqual({ ready: false, games: 1, needed: 6 });
    expect((await duelSummary(db, gosc)).form).toEqual({ ready: false, games: 0, needed: 6 });
    const b = (await opponents(db, ania)).find((o) => o.name === "Bartek")!;
    expect(b.lastWon).toBe(false);
    const { rival, h2h } = await rivalSummary(db, ania, b.id);
    expect(rival.name).toBe("Bartek");
    expect(h2h).toMatchObject({ won: 0, lost: 1, streak: { winnerId: b.id, n: 1 } });
    // Marek (gość) nie grał z Bartkiem i nie jest w jego lidze.
    const marek = await requireProfile(db, gosc);
    await expect(rivalSummary(db, bartek, marek.id)).rejects.toThrow(/Nie ma takiego gracza/);
  });
});
