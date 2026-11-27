"use client";

import type { FormDirection, PlayerForm } from "@/lib/game/form";

const num = (n: number) => n.toFixed(1).replace(".", ",");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n))}`;

const LOOK: Record<FormDirection, { title: string; arrow: string; text: string; bg: string; stroke: string }> = {
  up: { title: "Forma rośnie", arrow: "↗", text: "text-green", bg: "bg-green/15", stroke: "var(--c-green)" },
  down: { title: "Forma spada", arrow: "↘", text: "text-red", bg: "bg-red/15", stroke: "var(--c-red)" },
  flat: { title: "Forma stabilna", arrow: "→", text: "text-muted", bg: "bg-surface-2", stroke: "var(--c-muted)" },
};

/**
 * Sekcja „Forma”: kierunek, wykres średniej na serię z ostatnich gier
 * i porównanie nowszych gier ze starszymi. `title` – nagłówek sekcji,
 * `source` – z jakich gier (pod tytułem formy), `legend` – pokaż ● liga / ○ 1 na 1.
 */
export function FormCard({
  form,
  title = "Forma",
  source,
  legend = true,
}: {
  form: PlayerForm;
  title?: string;
  source: string;
  legend?: boolean;
}) {
  return (
    <section aria-labelledby="form-title">
      <h2 id="form-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        📈 {title}
      </h2>
      {form.ready ? <Ready form={form} source={source} legend={legend} /> : <NotYet games={form.games} needed={form.needed} />}
    </section>
  );
}

function NotYet({ games, needed }: { games: number; needed: number }) {
  const left = needed - games;
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl font-bold text-muted">
          ?
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-lg font-bold">Forma po {needed} grach</span>
          <span className="block text-sm text-muted">
            {games === 0 ? "Brak gier" : `Rozegrane: ${games}`}, brakuje jeszcze {left}.
          </span>
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={games}>
        <div className="h-full rounded-full bg-muted" style={{ width: `${(games / needed) * 100}%` }} />
      </div>
    </div>
  );
}

function Ready({ form, source, legend }: { form: Extract<PlayerForm, { ready: true }>; source: string; legend: boolean }) {
  const look = LOOK[form.direction];
  const hasDuel = legend && form.points.some((p) => p.duel);
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-extrabold ${look.bg} ${look.text}`}>
          {look.arrow}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-lg font-bold">{look.title}</span>
          <span className="block text-sm text-muted">{source}</span>
        </span>
        <span className="shrink-0 text-right leading-tight">
          <span className={`block font-mono text-2xl font-bold tabular-nums ${look.text}`}>{signed(form.delta)}</span>
          <span className="block text-[11px] text-muted">
            pkt na serię{form.change !== null && ` (${form.change > 0 ? "+" : ""}${Math.round(form.change * 100)}%)`}
          </span>
        </span>
      </div>

      <Sparkline form={form} stroke={look.stroke} markDuels={legend} />
      <div className="mt-0.5 flex justify-between text-[11px] text-muted">
        <span>← starsze</span>
        <span>{hasDuel ? "● liga · ○ 1 na 1 · " : ""}najnowsza →</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        <span />
        <span className="text-right text-[11px] text-muted">wcześniej</span>
        <span className="text-right text-[11px] text-muted">ostatnie {form.newer.games}</span>
        <span>Śr. na serię</span>
        <span className="text-right font-mono tabular-nums text-muted">{num(form.older.avg)}</span>
        <span className={`text-right font-mono font-bold tabular-nums ${look.text === "text-muted" ? "" : look.text}`}>{num(form.newer.avg)}</span>
        <span>Wygrane</span>
        <span className="text-right font-mono tabular-nums text-muted">
          {form.older.wins} z {form.older.games}
        </span>
        <span className="text-right font-mono tabular-nums">
          {form.newer.wins} z {form.newer.games}
        </span>
      </div>
    </div>
  );
}

/** Kropki = średnia na serię w kolejnych grach; przerywane linie = średnie starszej i nowszej części. */
function Sparkline({ form, stroke, markDuels }: { form: Extract<PlayerForm, { ready: true }>; stroke: string; markDuels: boolean }) {
  const W = 330;
  const H = 96;
  const vals = form.points.map((p) => p.avg);
  const lo = Math.min(...vals) - 4;
  const hi = Math.max(...vals) + 4;
  const n = vals.length;
  const x = (i: number) => 12 + (i * (W - 24)) / (n - 1);
  const y = (v: number) => H - 8 - ((v - lo) / (hi - lo)) * (H - 22);
  const split = form.older.games;
  const mid = (x(split - 1) + x(split)) / 2;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 block h-24 w-full"
      role="img"
      aria-label={`Średnia na serię w ${n} ostatnich grach: wcześniej ${num(form.older.avg)}, ostatnio ${num(form.newer.avg)}`}
    >
      <rect x={mid} y={0} width={W - mid} height={H} rx={8} fill={stroke} opacity={0.08} />
      <line x1={x(0)} x2={x(split - 1)} y1={y(form.older.avg)} y2={y(form.older.avg)} stroke="var(--c-muted)" strokeWidth={2} strokeDasharray="4 4" />
      <line x1={x(split)} x2={x(n - 1)} y1={y(form.newer.avg)} y2={y(form.newer.avg)} stroke={stroke} strokeWidth={2.5} strokeDasharray="4 4" />
      <polyline fill="none" stroke="var(--c-line)" strokeWidth={1.5} points={vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      {form.points.map((p, i) => {
        const c = i >= split ? stroke : "var(--c-muted)";
        return p.duel && markDuels ? (
          <circle key={i} cx={x(i)} cy={y(p.avg)} r={4.5} fill="var(--c-surface)" stroke={c} strokeWidth={2.5} />
        ) : (
          <circle key={i} cx={x(i)} cy={y(p.avg)} r={i >= split ? 5 : 4} fill={c} stroke="var(--c-surface)" strokeWidth={1.5} />
        );
      })}
    </svg>
  );
}
