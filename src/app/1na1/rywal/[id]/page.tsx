import { Suspense } from "react";
import { RivalView } from "@/components/duel/RivalView";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Ty vs rywal – Dart" };

export default function RivalPage({ params }: PageProps<"/1na1/rywal/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<Loading />}>
        {params.then(({ id }) => (
          <RivalView id={id} />
        ))}
      </Suspense>
    </main>
  );
}
