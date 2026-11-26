import { MyTrainings } from "@/components/training/MyTrainings";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = { title: "Moje treningi – Dart" };

export default function MyTrainingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-2">
      <AppHeader title="📈 Moje treningi" backHref="/trening" />
      <MyTrainings />
    </main>
  );
}
