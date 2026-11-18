import { Suspense } from "react";
import { Loading } from "@/components/league/StatusScreens";
import { LiveView } from "@/components/live/LiveView";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = { title: "Na żywo – Dart" };

export default function LivePage({ params }: PageProps<"/na-zywo/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Na żywo" backHref="/" />
      <Suspense fallback={<Loading />}>
        {params.then(({ id }) => (
          <LiveView id={decodeURIComponent(id)} />
        ))}
      </Suspense>
    </main>
  );
}
