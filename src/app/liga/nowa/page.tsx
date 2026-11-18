import { AppHeader } from "@/components/ui/AppHeader";
import { CreateLeagueForm } from "@/components/league/CreateLeagueForm";

export const metadata = { title: "Nowa liga – Dart" };

export default function NewLeaguePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Nowa liga" backHref="/" />
      <CreateLeagueForm />
    </main>
  );
}
