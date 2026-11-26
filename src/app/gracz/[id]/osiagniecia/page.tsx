import { Suspense } from "react";
import { AchievementGallery } from "@/components/achievements/AchievementGallery";
import { Loading } from "@/components/league/StatusScreens";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = { title: "Osiągnięcia – Dart" };

export default function AchievementsPage({ params }: PageProps<"/gracz/[id]/osiagniecia">) {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Suspense fallback={<Loading />}>
        {params.then(({ id }) => (
          <>
            <AppHeader title="Osiągnięcia" backHref={`/gracz/${id}`} />
            <AchievementGallery memberId={decodeURIComponent(id)} />
          </>
        ))}
      </Suspense>
    </main>
  );
}
