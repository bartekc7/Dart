import { AppHeader } from "@/components/ui/AppHeader";
import { InstallGuide } from "@/components/InstallGuide";
import { ThemePicker } from "@/components/ThemePicker";
import { EntryModePicker } from "@/components/EntryModePicker";
import { VoicePicker } from "@/components/VoicePicker";

export const metadata = { title: "Opcje – Dart" };

export default function OptionsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Opcje" backHref="/" />
      <EntryModePicker />
      <VoicePicker />
      <ThemePicker />
      <InstallGuide />
    </main>
  );
}
