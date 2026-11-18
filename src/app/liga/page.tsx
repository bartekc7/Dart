import { AppHeader } from "@/components/ui/AppHeader";
import { LeaguePanel } from "@/components/league/LeaguePanel";

export const metadata = { title: "Liga – Dart" };

export default function LeaguePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Liga" backHref="/" />
      <LeaguePanel />
    </main>
  );
}
