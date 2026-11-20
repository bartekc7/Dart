/**
 * Zamienia zeskanowany lub wklejony tekst na stronę aplikacji:
 * link zaproszenia (/dolacz/KOD), link nowego telefonu (/przypisz/TOKEN)
 * albo sam kod ligi (8 znaków). Adres strony nie ma znaczenia, liczy się ścieżka,
 * więc działa też link skopiowany z innej domeny aplikacji.
 */
export function joinTarget(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  const path = text.match(/\/(dolacz|przypisz)\/([A-Za-z0-9_-]+)/);
  if (path) {
    const [, kind, value] = path;
    return kind === "dolacz" ? `/dolacz/${value.toUpperCase()}` : `/przypisz/${value}`;
  }

  const code = text.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? `/dolacz/${code}` : null;
}
