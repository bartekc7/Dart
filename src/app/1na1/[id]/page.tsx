import { Suspense } from "react";
import { DuelScreen } from "@/components/duel/DuelScreen";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Pojedynek 1 na 1 – Dart" };

export default function DuelPage({ params }: PageProps<"/1na1/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ id }) => (
        <DuelScreen id={id} />
      ))}
    </Suspense>
  );
}
