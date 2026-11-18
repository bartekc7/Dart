import { AppHeader } from "@/components/ui/AppHeader";
import { InstallGuide } from "@/components/InstallGuide";
import { ThemePicker } from "@/components/ThemePicker";

export const metadata = { title: "Opcje – Dart" };

export default function OptionsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Opcje" backHref="/" />
      <ThemePicker />
      <InstallGuide />
    </main>
  );
}
