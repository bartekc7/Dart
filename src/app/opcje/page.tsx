import { AppHeader } from "@/components/ui/AppHeader";
import { ThemePicker } from "@/components/ThemePicker";

export const metadata = { title: "Opcje – Dart" };

export default function OptionsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Opcje" backHref="/" />
      <ThemePicker />
    </main>
  );
}
