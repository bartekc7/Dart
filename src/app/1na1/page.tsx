import { DuelHub } from "@/components/duel/DuelHub";

export const metadata = { title: "1 na 1 – Dart" };

export default function DuelsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <DuelHub />
    </main>
  );
}
