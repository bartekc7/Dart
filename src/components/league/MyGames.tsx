import type { MyGame } from "@/lib/server/league";

const MEDALS = ["🥇", "🥈", "🥉"];

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `dziś ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `wczoraj ${time}`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

/** Ostatnie wyniki tego gracza. */
export function MyGames({ games }: { games: MyGame[] }) {
  if (games.length === 0) return null;
  return (
    <section aria-labelledby="my-games-title">
      <h2 id="my-games-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Twoje ostatnie gry
      </h2>
      <ul className="flex flex-col gap-1.5">
        {games.map((g) => (
          <li key={g.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
            <span className="w-7 text-center text-lg">
              {MEDALS[g.place - 1] ?? <span className="font-mono text-sm text-muted">{g.place}.</span>}
            </span>
            <span className="flex-1 font-medium">
              {g.place}. miejsce <span className="text-muted">z {g.players}</span>
            </span>
            <span className="text-sm text-muted">
              do {g.target} · {when(g.finishedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
