import {
  addAim, addCheckout, addClock, addFree, CHECKOUT_MAX, CHECKOUT_MIN, CHECKOUT_ROUNDS, isTrainingOver, isTrainingState,
  endFree, FREE_MAX_DARTS, startTraining, trainingScore, trainingVariant, type AimHit, type TrainingRecord, type TrainingState,
} from "../training";
import type { Db } from "./db";
import { UserError, type Me } from "./league";

/** Najwięcej rzutek w Dookoła tarczy, które przyjmiemy (dalej to raczej pomyłka). */
const MAX_CLOCK_DARTS = 500;
/** Trening dłuższy niż tyle nie ma sensownego czasu startu. */
const MAX_TRAINING_MS = 3 * 60 * 60 * 1000;

/** Odtwarza trening od zera (tylko dozwolone ruchy), żeby nie ufać wynikowi z telefonu. */
function replay(raw: unknown): TrainingState {
  if (!isTrainingState(raw)) throw new UserError("Nieprawidłowy trening.");
  let s: TrainingState;
  if (raw.mode === "free") {
    if (raw.darts.length > FREE_MAX_DARTS) throw new UserError("Za dużo rzutek.");
    s = startTraining("free", "20", Math.random, raw.startedAt);
    for (const d of raw.darts) {
      const next = typeof d === "string" ? addFree(s, d) : s;
      if (next === s) throw new UserError("Nieprawidłowa rzutka.");
      s = next;
    }
    if (raw.ended) s = endFree(s);
  } else if (raw.mode === "aim") {
    s = startTraining("aim", raw.target, Math.random, raw.startedAt);
    for (const d of raw.darts) {
      if (!["S", "D", "T", "0"].includes(d as string) || (raw.target === "25" && d === "T"))
        throw new UserError("Nieprawidłowa rzutka.");
      s = addAim(s, d as AimHit);
    }
  } else if (raw.mode === "clock") {
    if (raw.darts.length > MAX_CLOCK_DARTS) throw new UserError("Za dużo rzutek.");
    s = startTraining("clock", "20", Math.random, raw.startedAt);
    for (const d of raw.darts) s = addClock(s, d === true);
  } else {
    const ok =
      raw.targets.length === CHECKOUT_ROUNDS &&
      raw.targets.every((t) => Number.isInteger(t) && t >= CHECKOUT_MIN && t <= CHECKOUT_MAX);
    if (!ok) throw new UserError("Nieprawidłowe końcówki.");
    s = { mode: "checkout", targets: [...raw.targets], results: [], startedAt: raw.startedAt };
    for (const r of raw.results) s = addCheckout(s, r === true);
  }
  if (!isTrainingOver(s)) throw new UserError("Trening nie jest zakończony.");
  return s;
}

/** Zapis zakończonego treningu. Ponowny zapis tego samego id nadpisuje (np. po cofnięciu rzutki). */
export async function saveTraining(db: Db, me: Me, input: { id?: unknown; data?: unknown }): Promise<{ created: boolean }> {
  const id = typeof input.id === "string" ? input.id.slice(0, 64) : "";
  if (!id) throw new UserError("Brak identyfikatora treningu.");
  const s = replay(input.data);
  const now = Date.now();
  const started = now - s.startedAt <= MAX_TRAINING_MS && s.startedAt <= now ? new Date(s.startedAt) : null;
  const { rows } = await db.query("select member_id from trainings where id = $1", [id]);
  if (rows[0] && rows[0].member_id !== me.member.id) throw new UserError("Nie można zapisać tego treningu.", 403);
  await db.query(
    `insert into trainings (id, league_id, member_id, mode, variant, score, data, started_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do update set mode = excluded.mode, variant = excluded.variant,
       score = excluded.score, data = excluded.data, finished_at = now()`,
    [id, me.league.id, me.member.id, s.mode, trainingVariant(s), trainingScore(s), JSON.stringify(s), started],
  );
  return { created: !rows[0] };
}

/** Treningi gracza (tylko własne – nikt inny ich nie widzi), od najnowszego. */
export async function myTrainings(db: Db, me: Me): Promise<TrainingRecord[]> {
  const { rows } = await db.query(
    `select id, mode, variant, score, data, started_at, finished_at
       from trainings where member_id = $1
      order by finished_at desc limit 500`,
    [me.member.id],
  );
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    variant: r.variant,
    score: Number(r.score),
    data: r.data,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : new Date(r.finished_at).getTime(),
    finishedAt: new Date(r.finished_at).getTime(),
  }));
}

/** Usunięcie własnego treningu. */
export async function deleteTraining(db: Db, me: Me, id: string) {
  await db.query("delete from trainings where id = $1 and member_id = $2", [id, me.member.id]);
}
