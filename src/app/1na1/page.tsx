import { NewDuel } from "@/components/duel/NewDuel";

export const metadata = { title: "1 na 1 – Dart" };

export default function DuelsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <NewDuel />
    </main>
  );
}
