import { AppHeader } from "@/components/ui/AppHeader";
import { ReleaseItems } from "@/components/WhatsNew";
import { RELEASES } from "@/lib/whatsNew";

export const metadata = { title: "Co nowego – Dart" };

export default function WhatsNewPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="🎉 Co nowego" backHref="/opcje" />
      {RELEASES.map((r) => (
        <section key={r.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{r.date}</h2>
          <ReleaseItems release={r} />
        </section>
      ))}
    </main>
  );
}
