import { Suspense } from "react";
import { InviteLanding } from "@/components/duel/InviteLanding";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Zaproszenie 1 na 1 – Dart" };

export default function InvitePage({ params }: PageProps<"/1na1/zaproszenie/[code]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<Loading />}>
        {params.then(({ code }) => (
          <InviteLanding code={code} />
        ))}
      </Suspense>
    </main>
  );
}
