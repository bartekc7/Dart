import { Suspense } from "react";
import { ClaimDevice } from "@/components/league/ClaimDevice";
import { Loading } from "@/components/league/StatusScreens";

export const metadata = { title: "Nowy telefon – Dart" };

export default function ClaimPage({ params }: PageProps<"/przypisz/[token]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ token }) => (
        <ClaimDevice token={token} />
      ))}
    </Suspense>
  );
}
