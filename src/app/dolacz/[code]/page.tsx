import { Suspense } from "react";
import { JoinLeague } from "@/components/league/JoinLeague";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Dołącz do ligi – Dart" };

export default function JoinPage({ params }: PageProps<"/dolacz/[code]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ code }) => (
        <JoinLeague code={code} />
      ))}
    </Suspense>
  );
}
