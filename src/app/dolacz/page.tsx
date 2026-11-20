import { AppHeader } from "@/components/ui/AppHeader";
import { JoinScanner } from "@/components/league/JoinScanner";

export const metadata = { title: "Dołącz do ligi – Dart" };

export default function JoinScanPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Dołącz do ligi" backHref="/" />
      <JoinScanner />
    </main>
  );
}
