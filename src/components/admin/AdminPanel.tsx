import Link from "next/link";
import { adminLogin, adminLogout } from "@/app/admin/actions";
import { agoLabel, eventLabel, EVENTS_KEEP_DAYS, type DayCount } from "@/lib/events";
import { formatBytes } from "@/lib/bytes";
import { deployInfo, type DeployInfo } from "@/lib/deploy";
import { ERRORS_KEEP_DAYS } from "@/lib/errors";
import {
  adminDbSize,
  adminEvents,
  adminInactiveLeagues,
  adminLeagues,
  adminMembers,
  adminSummary,
  ADMIN_EVENTS_LIMIT,
  INACTIVE_DAYS,
  type AdminDbSize,
  type AdminEvent,
  type AdminLeague,
  type AdminMember,
  type AdminSummary,
  type InactiveLeague,
} from "@/lib/server/admin";
import { actionToken, adminKey } from "@/lib/server/adminAuth";
import { getDb } from "@/lib/server/db";
import { adminErrors, pruneErrors, type AdminErrors } from "@/lib/server/errors";
import { pruneEvents } from "@/lib/server/events";
import { DeleteLeagueForm } from "./DeleteLeagueForm";

const card = "rounded-2xl bg-surface p-4 ring-1 ring-line";
const title = "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";

export function AdminLogin({ error }: { error: boolean }) {
  return (
    <form action={adminLogin} className="mx-auto flex w-full max-w-sm flex-col gap-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Panel admina</h1>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Klucz</span>
        <input
          name="key"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="min-h-14 rounded-2xl bg-surface-2 px-4 text-lg ring-1 ring-line focus:outline-2 focus:outline-cream"
        />
      </label>
      {error && <p className="text-sm text-red">Zły klucz.</p>}
      <button className="min-h-14 rounded-2xl bg-red px-5 text-lg font-semibold text-white active:scale-[0.98]">Wejdź</button>
    </form>
  );
}

export async function AdminPanel({ leagueId, memberId, deleted }: { leagueId?: string; memberId?: string; deleted?: string }) {
  let data: {
    leagues: AdminLeague[];
    members: AdminMember[];
    events: AdminEvent[];
    summary: AdminSummary;
    errors: AdminErrors;
    dbSize: AdminDbSize;
    inactive: InactiveLeague[];
  };
  try {
    const db = await getDb();
    await Promise.all([pruneEvents(db), pruneErrors(db)]);
    const [leagues, members, events, summary, errors, dbSize, inactive] = await Promise.all([
      adminLeagues(db),
      leagueId ? adminMembers(db, leagueId) : Promise.resolve([]),
      adminEvents(db, { leagueId, memberId }),
      adminSummary(db),
      adminErrors(db),
      adminDbSize(db),
      adminInactiveLeagues(db),
    ]);
    data = { leagues, members, events, summary, errors, dbSize, inactive };
  } catch (e) {
    console.error(e);
    return <p className="py-10 text-center text-muted">Nie udało się wczytać danych z bazy.</p>;
  }
  const { leagues, members, events, summary, errors, dbSize, inactive } = data;
  const now = new Date();
  const key = adminKey()!;
  const league = leagues.find((l) => l.id === leagueId);
  const member = members.find((m) => m.id === memberId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Wróć" className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-2xl ring-1 ring-line">
          ‹
        </Link>
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Panel admina</h1>
        <form action={adminLogout}>
          <button className="rounded-full px-3 py-2 text-sm text-muted ring-1 ring-line hover:text-ink">Wyloguj</button>
        </form>
      </header>

      {deleted && (
        <p role="status" className="rounded-2xl bg-green/15 px-4 py-3 text-sm ring-1 ring-green/40">
          Usunięto ligę <b>{deleted}</b> razem z jej danymi.
        </p>
      )}

      <Summary summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Health errors={errors} now={now} />
        <Version info={deployInfo()} now={now} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="leagues-title" className={card}>
            <h2 id="leagues-title" className={title}>
              Ligi ({leagues.length})
            </h2>
            {leagues.length === 0 ? (
              <p className="text-sm text-muted">Nie ma jeszcze żadnej ligi.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {leagues.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={l.id === leagueId ? "/admin" : `/admin?liga=${encodeURIComponent(l.id)}`}
                      aria-current={l.id === leagueId ? "true" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 active:opacity-70 ${l.id === leagueId ? "bg-cream/15 ring-1 ring-cream/40" : "bg-surface-2"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.name}</span>
                        <span className="block text-xs text-muted">założona {agoLabel(l.createdAt, now)}</span>
                      </span>
                      <span className="text-right text-xs text-muted">
                        <span className="block">
                          <b className="font-mono text-sm text-ink tabular-nums">{l.players}</b> {plural(l.players, "gracz", "graczy", "graczy")} ·{" "}
                          <b className="font-mono text-sm text-ink tabular-nums">{l.games}</b> {plural(l.games, "gra", "gry", "gier")}
                        </span>
                        <span className="block">aktywna {agoLabel(l.lastActive, now)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">Dotknij ligi, żeby zobaczyć jej graczy i tylko jej zdarzenia.</p>
          </section>

          {league && (
            <section aria-labelledby="members-title" className={card}>
              <h2 id="members-title" className={title}>
                Gracze – {league.name}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {members.map((m) => {
                  const selected = m.id === memberId;
                  const href = selected
                    ? `/admin?liga=${encodeURIComponent(league.id)}`
                    : `/admin?liga=${encodeURIComponent(league.id)}&gracz=${encodeURIComponent(m.id)}`;
                  return (
                    <li key={m.id}>
                      <Link
                        href={href}
                        aria-current={selected ? "true" : undefined}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 active:opacity-70 ${selected ? "bg-cream/15 ring-1 ring-cream/40" : "bg-surface-2"} ${m.active ? "" : "opacity-60"}`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {m.name}
                          {m.isOrganizer && <span className="ml-1.5 rounded-full bg-cream/20 px-2 py-0.5 text-[11px] font-semibold">organizator</span>}
                          {!m.active && <span className="ml-1.5 rounded-full bg-line px-2 py-0.5 text-[11px]">usunięty</span>}
                        </span>
                        <span className="text-right text-xs text-muted">
                          <span className="block">{m.devices === 0 ? "bez telefonu" : `${m.devices} ${plural(m.devices, "telefon", "telefony", "telefonów")}`}</span>
                          <span className="block">{agoLabel(m.lastActive, now)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="log-title" className={card}>
          <h2 id="log-title" className={title}>
            Rejestr zdarzeń
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
            {league ? (
              <>
                <Chip href="/admin" label={`Liga: ${league.name}`} />
                {member && <Chip href={`/admin?liga=${encodeURIComponent(league.id)}`} label={`Gracz: ${member.name}`} />}
              </>
            ) : (
              <span className="text-muted">Wszystkie ligi i goście 1 na 1</span>
            )}
          </div>
          <EventList events={events} now={now} showLeague={!league} />
          <p className="mt-3 text-xs text-muted">
            Najnowsze {ADMIN_EVENTS_LIMIT} wpisów. Zapisujemy tylko rodzaj akcji i czas, bez wyników. Wpisy starsze niż{" "}
            {EVENTS_KEEP_DAYS} dni kasują się same.
          </p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <InactiveLeagues
          leagues={inactive}
          now={now}
          tokens={Object.fromEntries(inactive.map((l) => [l.id, actionToken(key, "delete-league", l.id)]))}
        />
        <DbSize size={dbSize} now={now} />
      </div>
    </div>
  );
}

function Health({ errors, now }: { errors: AdminErrors; now: Date }) {
  const ok = errors.last24h === 0;
  return (
    <section aria-labelledby="health-title" className={card}>
      <h2 id="health-title" className={title}>
        Zdrowie aplikacji
      </h2>
      <div className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-3 ${ok ? "bg-green/15 ring-1 ring-green/40" : "bg-red/15 ring-1 ring-red/40"}`}>
        <span aria-hidden className="text-2xl">
          {ok ? "✅" : "⚠️"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {ok ? "Brak błędów w ostatnich 24 h" : `${errors.last24h} ${plural(errors.last24h, "błąd", "błędy", "błędów")} w ostatnich 24 h`}
          </span>
          <span className="block text-xs text-muted">w ostatnich 7 dniach: {errors.last7d}</span>
        </span>
      </div>
      {errors.recent.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">Nie zapisano żadnych błędów serwera.</p>
      ) : (
        <ul className="flex max-h-80 flex-col divide-y divide-line overflow-y-auto">
          {errors.recent.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block break-words font-mono text-xs">{e.message}</span>
                <span className="block truncate text-xs text-muted">
                  {e.kind}
                  {e.path && (
                    <>
                      {" · "}
                      <span className="font-mono">
                        {e.method ? `${e.method} ` : ""}
                        {e.path}
                      </span>
                    </>
                  )}
                  {e.source && ` · ${e.source}`}
                </span>
              </span>
              <time dateTime={e.at} className="whitespace-nowrap pt-0.5 text-xs text-muted">
                {agoLabel(e.at, now)}
              </time>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">
        Nieoczekiwane błędy API, stron i akcji serwera. Bez danych graczy: rodzaj błędu, skrócony komunikat i ścieżka bez identyfikatorów.
        Wpisy starsze niż {ERRORS_KEEP_DAYS} dni kasują się same.
      </p>
    </section>
  );
}

function Version({ info, now }: { info: DeployInfo; now: Date }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Środowisko",
      value: (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.env === "production" ? "bg-green/20" : "bg-cream/20"}`}>{info.env}</span>
      ),
    },
    {
      label: "Wdrożenie",
      value: info.builtAt ? (
        <time dateTime={info.builtAt}>
          {agoLabel(info.builtAt, now)} <span className="text-muted">({fullDate(info.builtAt)})</span>
        </time>
      ) : (
        "—"
      ),
    },
    {
      label: "Commit",
      value: info.shortSha ? (
        info.commitUrl ? (
          <a href={info.commitUrl} target="_blank" rel="noreferrer" className="font-mono underline decoration-line underline-offset-2">
            {info.shortSha}
          </a>
        ) : (
          <span className="font-mono">{info.shortSha}</span>
        )
      ) : (
        "—"
      ),
    },
    {
      label: "PR",
      value: info.pr ? (
        info.prUrl ? (
          <a href={info.prUrl} target="_blank" rel="noreferrer" className="font-mono underline decoration-line underline-offset-2">
            #{info.pr}
          </a>
        ) : (
          `#${info.pr}`
        )
      ) : (
        "—"
      ),
    },
    { label: "Gałąź", value: info.branch ? <span className="font-mono">{info.branch}</span> : "—" },
    { label: "Region", value: info.region ? <span className="font-mono">{info.region}</span> : "—" },
  ];
  return (
    <section aria-labelledby="version-title" className={card}>
      <h2 id="version-title" className={title}>
        Wersja na produkcji
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="min-w-0 break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
      {info.message && <p className="mt-3 break-words rounded-xl bg-surface-2 px-3 py-2 text-sm">{info.message}</p>}
      {!info.sha && <p className="mt-3 text-xs text-muted">Brak danych z Vercela – to wersja uruchomiona lokalnie.</p>}
    </section>
  );
}

function fullDate(at: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
}

function DbSize({ size, now }: { size: AdminDbSize; now: Date }) {
  const events = size.tables.find((t) => t.table === "events");
  const tiles = [
    { label: "cała baza", value: formatBytes(size.databaseBytes ?? size.tablesBytes) },
    { label: "wierszy razem", value: size.totalRows.toLocaleString("pl-PL") },
    { label: "rejestr zdarzeń", value: formatBytes(events?.bytes ?? null) },
  ];
  return (
    <section aria-labelledby="db-title" className={card}>
      <h2 id="db-title" className={title}>
        Rozmiar bazy
      </h2>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center rounded-xl bg-surface-2 px-2 py-2.5 text-center">
            <span className="font-mono text-lg font-bold tabular-nums">{t.value}</span>
            <span className="mt-0.5 text-xs leading-tight text-muted">{t.label}</span>
          </div>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-1 font-normal">Tabela</th>
            <th className="pb-1 text-right font-normal">Wiersze</th>
            <th className="pb-1 text-right font-normal">Rozmiar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {size.tables.map((t) => (
            <tr key={t.table}>
              <td className="py-1.5 pr-2">
                <span className="block">{t.label}</span>
                <span className="block font-mono text-[11px] text-muted">{t.table}</span>
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">{t.rows.toLocaleString("pl-PL")}</td>
              <td className="py-1.5 pl-2 text-right font-mono whitespace-nowrap tabular-nums">{formatBytes(t.bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        Rozmiar tabeli liczy dane razem z indeksami.
        {events && ` Rejestr zdarzeń: ${events.rows.toLocaleString("pl-PL")} ${plural(events.rows, "wpis", "wpisy", "wpisów")}`}
        {size.eventsSince && `, najstarszy ${agoLabel(size.eventsSince, now)}`}
        {events && "."}
      </p>
    </section>
  );
}

function InactiveLeagues({ leagues, now, tokens }: { leagues: InactiveLeague[]; now: Date; tokens: Record<string, string> }) {
  return (
    <section aria-labelledby="inactive-title" className={card}>
      <h2 id="inactive-title" className={title}>
        Nieaktywne ligi ({leagues.length})
      </h2>
      {leagues.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
          Wszystkie ligi grały w ostatnich {INACTIVE_DAYS} dniach.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {leagues.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.name}</span>
                <span className="block text-xs text-muted">
                  {l.lastGame ? `ostatnia gra ${agoLabel(l.lastGame, now)}` : "nigdy nie grali"} · założona {agoLabel(l.createdAt, now)}
                </span>
                <span className="block text-xs text-muted">
                  {l.players} {plural(l.players, "gracz", "graczy", "graczy")} · {l.games} {plural(l.games, "gra", "gry", "gier")} · {l.trainings}{" "}
                  {plural(l.trainings, "trening", "treningi", "treningów")}
                  {l.lastSeen && ` · telefon ${agoLabel(l.lastSeen, now)}`}
                </span>
              </span>
              <DeleteLeagueForm leagueId={l.id} name={l.name} token={tokens[l.id]} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">
        Liga jest nieaktywna, gdy od {INACTIVE_DAYS} dni nie było w niej gry ani treningu i nie trwa żadna gra. Usunięcie kasuje ligę razem
        z graczami, telefonami, grami i treningami. Inne ligi i gry 1 na 1 zostają bez zmian.
      </p>
    </section>
  );
}

/** Polska odmiana: 1 gra, 2 gry, 5 gier, 22 gry. */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 rounded-full bg-cream/15 px-3 py-1.5 font-medium ring-1 ring-cream/40">
      <span className="max-w-[14rem] truncate">{label}</span>
      <span aria-label="Usuń filtr" className="text-muted">
        ✕
      </span>
    </Link>
  );
}

function EventList({ events, now, showLeague }: { events: AdminEvent[]; now: Date; showLeague: boolean }) {
  if (events.length === 0)
    return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">Brak zdarzeń.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {events.map((e) => {
        const { label, icon } = eventLabel(e.type);
        const who = e.who ?? (e.detail ? e.detail : e.device ? `telefon ${e.device.slice(0, 6)}` : e.type.startsWith("admin_") ? "admin" : "nieznany");
        return (
          <li key={e.id} className="flex items-start gap-3 py-2">
            <span aria-hidden className="w-6 pt-0.5 text-center">
              {icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block truncate text-xs text-muted">
                {who}
                {e.guest && " (gość 1 na 1)"}
                {showLeague && e.leagueName && ` · ${e.leagueName}`}
                {e.device && e.who && <span className="font-mono"> · {e.device.slice(0, 6)}</span>}
              </span>
            </span>
            <time dateTime={e.at} className="whitespace-nowrap pt-0.5 text-xs text-muted">
              {agoLabel(e.at, now)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

function Summary({ summary }: { summary: AdminSummary }) {
  const totals = summary.days.reduce((s, d) => ({ games: s.games + d.games, trainings: s.trainings + d.trainings, duels: s.duels + d.duels }), {
    games: 0,
    trainings: 0,
    duels: 0,
  });
  const tiles = [
    { label: "aktywni dziś", value: summary.activeToday },
    { label: "aktywni w tym tygodniu", value: summary.activeWeek },
    { label: "zdarzeń dziś", value: summary.eventsToday },
  ];
  return (
    <section aria-label="Podsumowanie" className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
            <span className="font-mono text-2xl font-bold tabular-nums">{t.value}</span>
            <span className="mt-0.5 text-xs leading-tight text-muted">{t.label}</span>
          </div>
        ))}
      </div>
      <div className={card}>
        <h2 className={title}>Gry i treningi dziennie (14 dni)</h2>
        <DayChart days={summary.days} />
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <Legend color="bg-red" label={`gry ligowe: ${totals.games}`} />
          <Legend color="bg-green" label={`treningi: ${totals.trainings}`} />
          <Legend color="bg-cream" label={`1 na 1: ${totals.duels}`} />
        </p>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function DayChart({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.games + d.trainings + d.duels));
  return (
    <div className="flex h-32 items-end gap-1" role="img" aria-label="Wykres gier i treningów z ostatnich 14 dni">
      {days.map((d) => {
        const total = d.games + d.trainings + d.duels;
        const [, m, dd] = d.day.split("-");
        const h = (v: number) => `${(v / max) * 100}%`;
        return (
          <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1" title={`${dd}.${m}: gry ${d.games}, treningi ${d.trainings}, 1 na 1 ${d.duels}`}>
            <span className="font-mono text-[10px] text-muted tabular-nums">{total || ""}</span>
            <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-t">
              <div className="w-full bg-red" style={{ height: h(d.games) }} />
              <div className="w-full bg-green" style={{ height: h(d.trainings) }} />
              <div className="w-full bg-cream" style={{ height: h(d.duels) }} />
            </div>
            <span className="text-[10px] text-muted tabular-nums">{Number(dd)}</span>
          </div>
        );
      })}
    </div>
  );
}
