import { AppHeader } from "@/components/ui/AppHeader";
import { RecoverForm } from "@/components/league/RecoverForm";

export const metadata = { title: "Odzyskaj ligę – Dart" };

export default function RecoverPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Odzyskaj ligę" backHref="/" />
      <RecoverForm />
    </main>
  );
}
