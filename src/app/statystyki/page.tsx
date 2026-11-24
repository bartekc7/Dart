import { LeagueStatsView } from "@/components/league/LeagueStatsView";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = { title: "Statystyki ligi – Dart" };

export default function StatsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Statystyki ligi" backHref="/" />
      <LeagueStatsView />
    </main>
  );
}
