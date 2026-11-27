"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { LoadError, Loading } from "@/components/league/StatusScreens";
import { RECORD_COLOR } from "@/components/achievements/AchievementToasts";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { DartPad, type PendingDarts } from "@/components/game/DartPad";
import { checkout, DARTS_PER_TURN, fieldValue, formatCheckout, newId } from "@/lib/game/engine";
import { useDartInput, useSeenTrainingHelp, useStoredTraining, type StoredTraining } from "@/lib/game/storage";
import { aimHitFromKey, aimKeys, clockKeys } from "@/lib/game/board";
import { DartBoard } from "@/components/game/DartBoard";
import {
  addAim, addCheckout, addClock, addFree, aimPoints, aimSummary, AIM_DARTS, AIM_TARGETS, canUndo, CHECKOUT_ROUNDS, CLOCK_LAST,
  clockField, dartsWord, recentThrows, endFree, formatScore, freeSummary, FREE_RECORD_MIN_DARTS, isFreeSeriesRecord, isTrainingOver, isTrainingRecord, MODE_BY_ID, MODES, startTraining,
  trainingScore, trainingStats, trainingVariant, undoTraining, variantLabel, type AimHit, type AimTarget, type RecentThrow,
  type TrainingMode, type TrainingRecord, type TrainingState,
} from "@/lib/training";
import { useWakeLock } from "@/lib/useWakeLock";
import { RulesSheet } from "./RulesSheet";
import { useMyTrainings } from "./useTrainings";

const num = (n: number) => n.toFixed(1).replace(".", ",");
const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

/** Treningi solo: wybór trybu → trening → podsumowanie. Trwający trening żyje w telefonie. */
export function TrainingScreen() {
  const { state } = useLeague();
  const [stored, setStored] = useStoredTraining();
  const trainings = useMyTrainings();

  if (stored === undefined || state.status === "loading") return <Loading />;
  if (state.status === "error") return <LoadError {...state} />;
  if (!state.data.me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted">Najpierw załóż ligę albo dołącz do niej.</p>
        <ButtonLink href="/" className="max-w-xs">
          Wróć na start
        </ButtonLink>
      </div>
    );
  }
  const start = (mode: TrainingMode, target?: AimTarget) => setStored({ id: newId(), state: startTraining(mode, target) });
  if (!stored)
    return (
      <>
        <AppHeader title="🎯 Trening solo" backHref="/" />
        <Menu list={trainings.list} onStart={start} />
      </>
    );
  if (!isTrainingOver(stored.state))
    return <Play training={stored} onChange={(s) => setStored({ ...stored, state: s })} onCancel={() => setStored(null)} />;
  return (
    <Finished
      training={stored}
      list={trainings.list}
      reload={trainings.reload}
      onAgain={() => start(stored.state.mode, stored.state.mode === "aim" ? stored.state.target : undefined)}
      onUndo={() => setStored({ ...stored, state: undoTraining(stored.state) })}
      onDone={() => setStored(null)}
    />
  );
}

/* ───────────── Wybór trybu ───────────── */

function Menu({ list, onStart }: { list: TrainingRecord[] | null; onStart: (m: TrainingMode, t?: AimTarget) => void }) {
  const [rules, setRules] = useState<TrainingMode | null>(null);
  const best = (mode: TrainingMode, variant = "") => {
    const b = list ? trainingStats(list, mode, variant).best : null;
    return b ? formatScore(mode, b.score) : null;
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">
        Rzucasz sam, na swoim telefonie. Treningi mają osobne statystyki: nie liczą się do rankingu, statystyk ligi ani
        osiągnięć i widzisz je tylko Ty.
      </p>
      {MODES.map((m) => (
        <section key={m.mode} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none">{m.icon}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">{m.name}</h2>
              <p className="text-muted">{m.short}</p>
            </div>
            <button
              type="button"
              onClick={() => setRules(m.mode)}
              className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold ring-1 ring-line"
            >
              ℹ Zasady
            </button>
          </div>
          {m.mode === "aim" ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {AIM_TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onStart("aim", t.id)}
                  className="flex min-h-14 flex-col items-center justify-center rounded-2xl bg-red text-white shadow-lg shadow-red/20 active:scale-[0.98]"
                >
                  <span className="text-lg font-bold">W {t.label}</span>
                  {best("aim", t.id) && <span className="text-xs opacity-90">rekord {best("aim", t.id)}</span>}
                </button>
              ))}
            </div>
          ) : (
            <Button className="mt-3" onClick={() => onStart(m.mode)}>
              Start
              {best(m.mode) && <span className="text-sm font-normal opacity-90">· rekord {best(m.mode)}</span>}
            </Button>
          )}
        </section>
      ))}
      <ButtonLink href="/trening/moje" variant="secondary">
        📈 Moje treningi
      </ButtonLink>
      {rules && <RulesSheet mode={rules} onClose={() => setRules(null)} />}
    </div>
  );
}

/* ───────────── Trening ───────────── */

function Play({
  training,
  onChange,
  onCancel,
}: {
  training: StoredTraining;
  onChange: (s: TrainingState) => void;
  onCancel: () => void;
}) {
  useWakeLock();
  const s = training.state;
  const info = MODE_BY_ID[s.mode];
  const [seen, setSeen] = useSeenTrainingHelp();
  const [rules, setRules] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const firstTime = seen !== undefined && !(seen ?? []).includes(s.mode);
  const closeRules = () => {
    setRules(false);
    if (firstTime) setSeen([...(seen ?? []), s.mode]);
  };

  const progress =
    s.mode === "free"
      ? null
      : s.mode === "aim"
      ? s.darts.length / AIM_DARTS
      : s.mode === "clock"
        ? (clockField(s.darts) - 1) / CLOCK_LAST
        : s.results.length / s.targets.length;
  const counter =
    s.mode === "free"
      ? `${s.darts.length} ${dartsWord(s.darts.length)}`
      : s.mode === "aim"
      ? `${s.darts.length}/${AIM_DARTS}`
      : s.mode === "clock"
        ? `${s.darts.length} ${dartsWord(s.darts.length)}`
        : `${Math.min(s.results.length + 1, s.targets.length)}/${s.targets.length}`;

  return (
    <div className="flex flex-1 flex-col gap-4 [@media(max-height:700px)]:gap-2">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Przerwij trening"
          onClick={() => setConfirmCancel(true)}
          className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-xl ring-1 ring-line"
        >
          ✕
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-bold">
          {info.icon} {info.name}
          {s.mode === "aim" && ` · ${variantLabel(s.target)}`}
        </h1>
        <span className="min-w-11 text-right font-mono text-muted tabular-nums">{counter}</span>
      </header>
      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-green transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      {confirmCancel && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
          <p className="text-sm">Przerwać trening? Nie zostanie zapisany.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Nie
            </Button>
            <Button onClick={onCancel}>Przerwij</Button>
          </div>
        </div>
      )}

      {s.mode === "free" && <FreePlay s={s} onChange={onChange} />}
      {s.mode === "aim" && <AimPlay s={s} onChange={onChange} />}
      {s.mode === "clock" && <ClockPlay s={s} onChange={onChange} />}
      {s.mode === "checkout" && <CheckoutPlay s={s} onChange={onChange} />}

      <div className="mt-auto flex flex-col gap-2">
        {s.mode === "free" && (
          <Button disabled={!s.darts.length} onClick={() => onChange(endFree(s))}>
            🏁 Zakończ trening
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={!canUndo(s)} onClick={() => onChange(undoTraining(s))}>
            ↶ Cofnij
          </Button>
          <Button variant="secondary" onClick={() => setRules(true)}>
            ℹ Jak to działa?
          </Button>
        </div>
      </div>
      {(rules || firstTime) && <RulesSheet mode={s.mode} first={firstTime} onClose={closeRules} />}
    </div>
  );
}

const bigKey =
  "flex min-h-20 items-center justify-center rounded-2xl text-2xl font-bold ring-1 transition active:scale-[0.97]";

/** Swobodny: te same pola 1–20 co w grze, serie po 3 rzutki, bez celu. */
function FreePlay({ s, onChange }: { s: Extract<TrainingState, { mode: "free" }>; onChange: (s: TrainingState) => void }) {
  const sum = freeSummary(s.darts);
  const done = s.darts.length - (s.darts.length % DARTS_PER_TURN);
  const open = s.darts.slice(done);
  const pending: PendingDarts = { darts: open.map((f) => fieldValue(f) ?? 0), labels: open };
  const lastIdx = done / DARTS_PER_TURN - 1;
  const last = lastIdx >= 0 ? s.darts.slice(done - DARTS_PER_TURN, done) : null;
  // DartPad podaje całą bieżącą serię – podmieniamy niepełną serię na nową.
  const setOpen = (fields: string[]) => {
    let next: TrainingState = { ...s, darts: s.darts.slice(0, done) };
    for (const f of fields) next = addFree(next, f);
    onChange(next);
  };
  return (
    <>
      <section className="text-center" aria-live="polite">
        <p className="text-muted [@media(max-height:700px)]:text-sm">Średnio na serię</p>
        <p className="font-mono text-6xl leading-none font-bold tabular-nums [@media(max-height:700px)]:text-4xl">
          {s.darts.length ? num(sum.per3) : "–"}
        </p>
        <p className="mt-2 min-h-6 text-muted [@media(max-height:700px)]:mt-1 [@media(max-height:700px)]:text-sm">
          {last ? (
            <>
              Ostatnia: <span key={done} className="tap-pop inline-block font-mono font-semibold text-ink">{last.join(" ")}</span> ={" "}
              <strong className="text-ink">{sum.series[lastIdx]}</strong>
              {sum.bestSeries > 0 && ` · najlepsza ${sum.bestSeries}`}
            </>
          ) : (
            "Dotknij pola, w które trafiła rzutka."
          )}
        </p>
      </section>
      <DartPad
        remaining={Infinity}
        pending={pending}
        onPendingChange={(p) => setOpen(p.labels)}
        onSubmit={(_score, _darts, fields) => setOpen(fields)}
      />
    </>
  );
}

function AimPlay({ s, onChange }: { s: Extract<TrainingState, { mode: "aim" }>; onChange: (s: TrainingState) => void }) {
  const sum = aimSummary(s.target, s.darts);
  const bull = s.target === "25";
  const [input] = useDartInput();
  const board = input === "board";
  const keys: { hit: AimHit; text: string; cls: string }[] = bull
    ? [
        { hit: "S", text: "25", cls: "bg-green/20 ring-green" },
        { hit: "D", text: "Bull 50", cls: "bg-red/20 ring-red" },
        { hit: "0", text: "Pudło", cls: "bg-surface-2 ring-line text-muted" },
      ]
    : [
        { hit: "S", text: s.target, cls: "bg-surface-2 ring-line" },
        { hit: "D", text: `D${s.target}`, cls: "bg-green/20 ring-green" },
        { hit: "T", text: `T${s.target}`, cls: "bg-red/20 ring-red" },
        { hit: "0", text: "Pudło", cls: "bg-surface-2 ring-line text-muted" },
      ];
  return (
    <>
      <section className="pt-2 text-center" aria-live="polite">
        <p className="text-muted">Trafienia w {variantLabel(s.target)}</p>
        <p className="font-mono text-7xl leading-none font-bold tabular-nums">
          {sum.percent}
          <span className="text-3xl">%</span>
        </p>
        <p className="mt-2 text-muted">
          {sum.hits} z {sum.thrown}
          {!bull && ` · T${s.target}: ${sum.triples} · D${s.target}: ${sum.doubles}`}
          {bull && ` · Bull 50: ${sum.doubles}`}
        </p>
        <Recent s={s} />
      </section>
      <p className="text-center text-sm text-muted">Gdzie trafiła rzutka?</p>
      {board ? (
        <BoardKeys
          targets={aimKeys(s.target)}
          onPick={(key) => {
            const hit = aimHitFromKey(s.target, key);
            buzz(hit === "0" ? 15 : aimPoints(s.target, hit) >= 50 ? [30, 40, 30] : 30);
            onChange(addAim(s, hit));
          }}
        />
      ) : (
      <div className={`grid gap-2 ${bull ? "grid-cols-3" : "grid-cols-2"}`}>
        {keys.map((k) => (
          <button
            key={k.hit}
            type="button"
            className={`${bigKey} ${k.cls}`}
            onClick={() => {
              buzz(k.hit === "0" ? 15 : aimPoints(s.target, k.hit) >= 50 ? [30, 40, 30] : 30);
              onChange(addAim(s, k.hit));
            }}
          >
            {k.text}
          </button>
        ))}
      </div>
      )}
    </>
  );
}

function ClockPlay({ s, onChange }: { s: Extract<TrainingState, { mode: "clock" }>; onChange: (s: TrainingState) => void }) {
  const field = clockField(s.darts);
  const hits = field - 1;
  const [input] = useDartInput();
  const targets = clockKeys(field, CLOCK_LAST);
  return (
    <>
      <section className="pt-2 text-center" aria-live="polite">
        <p className="text-muted">Celuj w</p>
        <p className="font-mono text-8xl leading-none font-bold tabular-nums">{field === CLOCK_LAST ? "Bull" : field}</p>
        <p className="mt-2 text-muted">
          {field === CLOCK_LAST ? "ostatnie pole – 25 albo 50" : `potem ${field + 1 === CLOCK_LAST ? "Bull" : field + 1}`} · trafione{" "}
          {hits} z {CLOCK_LAST}
        </p>
        <Recent s={s} />
      </section>
      {input === "board" ? (
        <BoardKeys
          targets={targets}
          onPick={(key) => {
            const hit = targets.includes(key);
            buzz(hit ? 30 : 15);
            onChange(addClock(s, hit));
          }}
        />
      ) : (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${bigKey} bg-green text-white ring-green`}
          onClick={() => {
            buzz(30);
            onChange(addClock(s, true));
          }}
        >
          ✓ Trafiona
        </button>
        <button type="button" className={`${bigKey} bg-surface-2 text-muted ring-line`} onClick={() => {
            buzz(15);
            onChange(addClock(s, false));
          }}
        >
          Pudło
        </button>
      </div>
      )}
    </>
  );
}

const CHIP: Record<RecentThrow["kind"], string> = {
  miss: "bg-surface-2 text-muted ring-1 ring-line",
  hit: "bg-surface-2 text-ink ring-1 ring-line",
  double: "bg-green text-white",
  triple: "bg-red text-white",
};

/** Ostatnie wpisy: nowy „wyskakuje”, więc każde dotknięcie – także pudło – widać od razu. */
function Recent({ s }: { s: TrainingState }) {
  const all = s.mode === "checkout" ? s.results.length : s.mode === "free" ? 0 : s.darts.length;
  const list = recentThrows(s, 4);
  return (
    <p className="mt-3 flex min-h-8 flex-wrap justify-center gap-2 [@media(max-height:700px)]:mt-1.5" aria-label="Ostatnie rzuty">
      {list.map((t, i) => {
        const newest = i === list.length - 1;
        return (
          <span
            key={all - list.length + i}
            className={`rounded-full px-3 py-0.5 font-mono font-bold ${CHIP[t.kind]} ${newest ? "tap-pop ring-2 ring-cream" : "opacity-70"}`}
          >
            {t.label}
          </span>
        );
      })}
    </p>
  );
}

/** Klikalna tarcza w treningu: pola celu na żółto, obok przycisk „Pudło”. */
function BoardKeys({ targets, onPick }: { targets: string[]; onPick: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <DartBoard targets={targets} onPick={(key) => onPick(key)} />
      <button
        type="button"
        className="min-h-12 rounded-2xl bg-surface-2 text-lg font-semibold text-muted ring-1 ring-line transition active:scale-[0.97]"
        onClick={() => onPick("0")}
      >
        ✕ Pudło
      </button>
    </div>
  );
}

function CheckoutPlay({
  s,
  onChange,
}: {
  s: Extract<TrainingState, { mode: "checkout" }>;
  onChange: (s: TrainingState) => void;
}) {
  const left = s.targets[s.results.length];
  const hint = checkout(left);
  const done = s.results.filter(Boolean).length;
  return (
    <>
      <section className="rounded-3xl bg-gradient-to-b from-green to-[#137a3f] px-4 py-5 text-center text-white" aria-live="polite">
        <p className="opacity-90">Zostało · masz 3 rzutki</p>
        <p className="font-mono text-8xl leading-none font-bold tabular-nums">{left}</p>
        {hint && (
          <p className="mx-auto mt-2 w-fit rounded-full bg-white/20 px-3 py-0.5 font-mono text-lg font-bold">
            <span className="font-sans text-sm font-semibold opacity-90">🎯 kończ: </span>
            {formatCheckout(hint)}
          </p>
        )}
      </section>
      <p className="text-center text-muted">
        Udane: <strong className="text-ink">{done}</strong> z {s.results.length}
      </p>
      <Recent s={s} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${bigKey} bg-green text-white ring-green`}
          onClick={() => {
            buzz([30, 40, 30]);
            onChange(addCheckout(s, true));
          }}
        >
          ✓ Udało się
        </button>
        <button type="button" className={`${bigKey} bg-surface-2 text-muted ring-line`} onClick={() => {
            buzz(15);
            onChange(addCheckout(s, false));
          }}
        >
          ✗ Nie
        </button>
      </div>
    </>
  );
}

/* ───────────── Koniec ───────────── */

type Save = { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

function Finished({
  training,
  list,
  reload,
  onAgain,
  onUndo,
  onDone,
}: {
  training: StoredTraining;
  list: TrainingRecord[] | null;
  reload: () => Promise<void>;
  onAgain: () => void;
  onUndo: () => void;
  onDone: () => void;
}) {
  const s = training.state;
  const info = MODE_BY_ID[s.mode];
  const [save, setSave] = useState<Save>({ status: "saving" });
  const [endedAt] = useState(() => Date.now());
  // Rekord liczymy względem listy sprzed zapisu (zapamiętanej przy pierwszym wczytaniu).
  const [before, setBefore] = useState<TrainingRecord[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zapamiętujemy stan sprzed zapisu
    if (list && !before) setBefore(list.filter((t) => t.id !== training.id));
  }, [list, before, training.id]);

  const doSave = useCallback(async () => {
    setSave({ status: "saving" });
    try {
      await api("/api/trainings", { body: { id: training.id, data: training.state } });
      setSave({ status: "saved" });
      reload();
    } catch (e) {
      setSave({ status: "error", message: (e as Error).message });
    }
  }, [training, reload]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zapis startuje po wejściu na ekran
    doSave();
  }, [doSave]);

  const score = trainingScore(s);
  const variant = trainingVariant(s);
  const me = { id: training.id, mode: s.mode, variant, score, data: s };
  const prevBest = before ? isTrainingRecord(before, me) : null;
  const prevSeries = before && s.mode === "free" ? isFreeSeriesRecord(before, training.id, s.darts) : null;
  const withThis: TrainingRecord[] | null = before
    ? [...before, { ...me, data: s, startedAt: s.startedAt, finishedAt: endedAt }]
    : null;
  const stats = withThis ? trainingStats(withThis, s.mode, variant) : null;
  const minutes = Math.max(1, Math.round((endedAt - s.startedAt) / 60000));

  const tiles: { label: string; value: string; gold?: boolean }[] = [];
  if (s.mode === "free") {
    const sum = freeSummary(s.darts);
    tiles.push({ label: "śr. na serię", value: num(sum.per3), gold: !!prevBest });
    tiles.push({ label: "najlepsza seria", value: String(sum.bestSeries), gold: prevSeries !== null });
    tiles.push({ label: dartsWord(sum.darts), value: String(sum.darts) });
  } else if (s.mode === "aim") {
    const sum = aimSummary(s.target, s.darts);
    tiles.push({ label: `w ${variantLabel(s.target)}`, value: `${sum.percent}%`, gold: !!prevBest });
    tiles.push(
      s.target === "25"
        ? { label: "Bull 50", value: String(sum.doubles) }
        : { label: `T${s.target}`, value: String(sum.triples) },
    );
    tiles.push({ label: "śr. na 3 rzutki", value: num(sum.per3) });
  } else if (s.mode === "clock") {
    tiles.push({ label: "rzutek", value: String(score), gold: !!prevBest });
    tiles.push({ label: "trafień", value: String(CLOCK_LAST) });
    tiles.push({ label: "skuteczność", value: `${Math.round((CLOCK_LAST / score) * 100)}%` });
  } else {
    tiles.push({ label: `udanych z ${CHECKOUT_ROUNDS}`, value: String(score), gold: !!prevBest });
    const hardest = s.targets.filter((_, i) => s.results[i]).reduce((a, b) => Math.max(a, b), 0);
    tiles.push({ label: "najwyższa udana", value: hardest ? String(hardest) : "–" });
    tiles.push({ label: "czas", value: `${minutes} min` });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {prevBest && (
        <RecordBubble
          title={`${info.name}${s.mode === "aim" ? ` w ${variantLabel(s.target)}` : ""}${s.mode === "free" ? " – średnia" : ""}: ${formatScore(s.mode, score)}`}
          prev={formatScore(s.mode, prevBest.score)}
        />
      )}
      {prevSeries !== null && s.mode === "free" && (
        <RecordBubble title={`Najlepsza seria: ${freeSummary(s.darts).bestSeries}`} prev={String(prevSeries)} />
      )}
      <section className="pt-2 text-center">
        <p className="text-5xl">{info.icon}</p>
        <h1 className="mt-2 text-3xl font-bold">Koniec treningu</h1>
        <p className="mt-1 text-muted">
          {info.name}
          {s.mode === "aim" && ` · ${variantLabel(s.target)} · ${AIM_DARTS} rzutek`}
          {s.mode === "free" && ` · ${s.darts.length} ${dartsWord(s.darts.length)}`} · {minutes} min
        </p>
        <SaveStatus save={save} onRetry={doSave} />
        {s.mode === "free" && s.darts.length < FREE_RECORD_MIN_DARTS && (
          <p className="mt-1 text-sm text-muted">Rekord średniej liczy się od {FREE_RECORD_MIN_DARTS} rzutek.</p>
        )}
      </section>
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
            <dd className="font-mono text-2xl font-bold tabular-nums" style={t.gold ? { color: RECORD_COLOR } : undefined}>
              {t.value}
            </dd>
            <dt className="text-xs leading-tight text-muted">{t.label}</dt>
          </div>
        ))}
      </dl>
      {stats && stats.count > 1 && stats.recentAvg !== null && (
        <p className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
          Ostatnie {Math.min(stats.count, 10)} treningów: śr. <strong>{formatAvg(s.mode, stats.recentAvg)}</strong>
          {stats.trend !== null && <Trend mode={s.mode} trend={stats.trend} />}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onAgain}>Jeszcze raz</Button>
          <Button variant="secondary" onClick={onDone}>
            Gotowe
          </Button>
        </div>
        <Link href="/trening/moje" onClick={onDone} className="py-2 text-center text-muted">
          📈 Moje treningi
        </Link>
        <button
          type="button"
          onClick={async () => {
            await api(`/api/trainings/${encodeURIComponent(training.id)}`, { method: "DELETE" }).catch(() => {});
            onUndo();
          }}
          className="py-1 text-sm text-muted"
        >
          ↶ Pomyłka? Cofnij {s.mode === "checkout" ? "ostatnią końcówkę" : "ostatnią rzutkę"}
        </button>
      </div>
    </div>
  );
}

function RecordBubble({ title, prev }: { title: string; prev: string }) {
  return (
    <div
      role="status"
      className="ach-toast flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 ring-1"
      style={{ "--tw-ring-color": RECORD_COLOR, boxShadow: `0 0 0 4px color-mix(in oklab, ${RECORD_COLOR} 20%, transparent)` } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl"
        style={{ borderColor: RECORD_COLOR, backgroundColor: `color-mix(in oklab, ${RECORD_COLOR} 20%, transparent)` }}
      >
        📈
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-bold uppercase tracking-wider" style={{ color: RECORD_COLOR }}>
          📈 Rekord treningu
        </span>
        <span className="mt-0.5 block text-lg font-bold">{title}</span>
        <span className="block text-sm text-muted">Poprzedni: {prev}</span>
      </span>
    </div>
  );
}

export function formatAvg(mode: TrainingMode, v: number): string {
  if (mode === "free") return num(v);
  if (mode === "aim") return `${Math.round(v)}%`;
  if (mode === "checkout") return `${num(v)} z ${CHECKOUT_ROUNDS}`;
  return `${Math.round(v)} ${dartsWord(Math.round(v))}`;
}

export function Trend({ mode, trend }: { mode: TrainingMode; trend: number }) {
  const good = MODE_BY_ID[mode].lowerIsBetter ? trend < 0 : trend > 0;
  if (Math.abs(trend) < 0.05) return <span className="text-muted"> · bez zmian</span>;
  const size = mode === "checkout" || mode === "free" ? num(Math.abs(trend)) : String(Math.round(Math.abs(trend)));
  const unit = mode === "aim" ? " pkt %" : mode === "free" ? " pkt" : mode === "clock" ? ` ${dartsWord(Math.round(Math.abs(trend)))}` : "";
  return (
    <span className={`font-bold ${good ? "text-green" : "text-red"}`}>
      {" "}
      {good ? "▲" : "▼"} {size}
      {unit}
    </span>
  );
}

function SaveStatus({ save, onRetry }: { save: Save; onRetry: () => void }) {
  if (save.status === "saving") return <p className="mt-2 text-sm text-muted">Zapisuję trening…</p>;
  if (save.status === "saved")
    return <p className="mt-2 text-sm font-medium text-green">✓ Zapisano w Twoich treningach</p>;
  return (
    <div role="alert" className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-red/10 px-4 py-3">
      <p className="text-sm font-medium text-red">Trening nie został zapisany. {save.message}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-xl bg-surface-2 px-4 font-semibold ring-1 ring-line">
        Spróbuj ponownie
      </button>
    </div>
  );
}
