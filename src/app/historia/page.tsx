import { AppHeader } from "@/components/ui/AppHeader";
import { GameHistory } from "@/components/league/GameHistory";

export const metadata = { title: "Historia gier – Dart" };

export default function HistoryPage() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <AppHeader title="Historia gier" backHref="/" />
      <GameHistory />
    </main>
  );
}
