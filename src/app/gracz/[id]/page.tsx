import { Suspense } from "react";
import { Loading } from "@/components/league/StatusScreens";
import { PlayerCard } from "@/components/league/PlayerCard";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = { title: "Gracz – Dart" };

export default function PlayerPage({ params }: PageProps<"/gracz/[id]">) {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Gracz" backHref="/" />
      <Suspense fallback={<Loading />}>
        {params.then(({ id }) => (
          <PlayerCard id={decodeURIComponent(id)} />
        ))}
      </Suspense>
    </main>
  );
}
