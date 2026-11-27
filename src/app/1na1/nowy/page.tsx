import { Suspense } from "react";
import { NewDuel } from "@/components/duel/NewDuel";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Nowy pojedynek – Dart" };

export default function NewDuelPage({ searchParams }: PageProps<"/1na1/nowy">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<Loading />}>
        {searchParams.then((sp) => (
          <NewDuel focusId={typeof sp.r === "string" ? sp.r : undefined} />
        ))}
      </Suspense>
    </main>
  );
}
