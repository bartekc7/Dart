/**
 * Lista zmian pokazywana w oknie „Co nowego”.
 * Nowe wydanie dopisujemy NA GÓRZE z nowym, większym `id` (data RRRR-MM-DD,
 * a gdy dwa wydania jednego dnia: RRRR-MM-DD-2). Okno pokaże się raz każdemu,
 * kto grał wcześniej, a potem jest dostępne w Opcjach.
 */
/** `icon`: emoji albo "duel" – znak 1 na 1 (skrzyżowane rzutki, rysowany w SVG). */
export type WhatsNewItem = { icon: string; title: string; text: string };
export type WhatsNewRelease = { id: string; date: string; items: WhatsNewItem[] };

export const RELEASES: WhatsNewRelease[] = [
  {
    id: "2026-11-27-8",
    date: "27 listopada",
    items: [
      {
        icon: "duel",
        title: "Nowy znak 1 na 1",
        text: "Gry 1 na 1 mają teraz własny znak: dwie skrzyżowane rzutki zamiast mieczy.",
      },
    ],
  },
  {
    id: "2026-11-27-7",
    date: "27 listopada",
    items: [
      {
        icon: "👆",
        title: "Widać każde stuknięcie",
        text: "Przyciski po dotknięciu na chwilę błyskają, a stuknięte pole tarczy się podświetla. W treningach pod wynikiem widać ostatnie rzuty, także pudła, a najnowszy „wyskakuje”, więc od razu wiesz, że rzutka się zapisała. Telefony z Androidem dodatkowo krótko wibrują.",
      },
    ],
  },
  {
    id: "2026-11-27-5",
    date: "27 listopada",
    items: [
      {
        icon: "📈",
        title: "Forma gracza",
        text: "Na karcie gracza (dotknij go w rankingu) jest nowa sekcja „Forma”. Pokazuje, czy w 5 ostatnich grach rzucasz lepiej (↗), gorzej (↘) czy podobnie (→) niż w 5 wcześniejszych, na podstawie średniej na serię. Liczą się gry ligowe i 1 na 1, a wykres pokazuje 10 ostatnich gier. Forma pojawia się po 6 grach. Ranking zostaje bez zmian.",
      },
    ],
  },
  {
    id: "2026-11-27-4",
    date: "27 listopada",
    items: [
      {
        icon: "🎯",
        title: "Klikalna tarcza",
        text: "Rzutki możesz teraz wpisywać, klikając w pola tarczy zamiast w przyciski 1–20. Na komputerze i tablecie tarcza włącza się sama, na telefonie wybierzesz ją w Opcjach › Wpisywanie rzutek. Pola, którymi kończysz, świecą na zielono, a czarny pierścień z numerami to pudło. Na telefonie przytrzymaj palec, żeby zobaczyć lupę, i puść na właściwym polu.",
      },
    ],
  },
  {
    id: "2026-11-27-3",
    date: "27 listopada",
    items: [
      {
        icon: "🤝",
        title: "Bilans z rywalami",
        text: "Ekran „1 na 1” pokazuje teraz Twój bilans, listę rywali i Twoje rekordy 1 na 1. Dotknij rywala, żeby zobaczyć Ty vs on: kto prowadzi, serię wygranych, średnie, najlepsze serie i ostatnie wspólne gry.",
      },
      {
        icon: "📈",
        title: "Rekordy 1 na 1",
        text: "Gry 1 na 1 mają własne rekordy: najlepsza seria, najszybsza wygrana i średnia meczu. Pobijesz rekord, to od razu zobaczysz dymek.",
      },
    ],
  },
  {
    id: "2026-11-27-2",
    date: "27 listopada",
    items: [
      {
        icon: "duel",
        title: "Gry 1 na 1",
        text: "Nowy przycisk „1 na 1” na starcie. Wybierz rywala z ligi, a zaproszenie wyskoczy w jego aplikacji. Każdy wpisuje swoje rzutki na swoim telefonie, gdy ma kolej, a drugi widzi je na żywo. Te gry nie liczą się do rankingu ligi i widzicie je tylko wy dwoje. Kogoś spoza ligi zaprosisz za pierwszym razem linkiem albo kodem QR.",
      },
    ],
  },
  {
    id: "2026-11-27",
    date: "27 listopada",
    items: [
      {
        icon: "🧘",
        title: "Trening swobodny",
        text: "Nowy, pierwszy tryb w Treningu solo: rzucasz, w co chcesz, dotykasz pól jak w grze i kończysz, kiedy chcesz. Na koniec widzisz średnią na serię i najlepszą serię, a w „Moje treningi” – rzutki, czas i postęp.",
      },
    ],
  },
  {
    id: "2026-11-26-4",
    date: "26 listopada",
    items: [
      {
        icon: "🦆",
        title: "Kolor albo ikonka gracza",
        text: "Wybierz swój kolor albo jedną z 30 ikonek (🐛 ☕ 🤖 💾 🔥…). Ikonka pokazuje się wszędzie zamiast kolorowej kropki. Każdy znak może mieć w lidze tylko jedna osoba. Zmienisz go w Opcjach (⚙️) › Twoja nazwa i znak.",
      },
    ],
  },
  {
    id: "2026-11-26-3",
    date: "26 listopada",
    items: [
      {
        icon: "📈",
        title: "Rekordy",
        text: "Pobijesz swoją najlepszą serię, najszybszą wygraną albo średnią w meczu? Wyskoczy złoty dymek. Rekord całej ligi zobaczą wszyscy w podglądzie. Twoje rekordy są na karcie gracza.",
      },
      {
        icon: "🎯",
        title: "Trening solo",
        text: "Nowy przycisk pod „Nowa gra”: Celowanie, Dookoła tarczy i Kończenie. Treningi widzisz tylko Ty i nie liczą się do rankingu, statystyk ligi ani osiągnięć.",
      },
    ],
  },
  {
    id: "2026-11-26-2",
    date: "26 listopada",
    items: [
      {
        icon: "🏆",
        title: "Osiągnięcia",
        text: "75 osiągnięć do zdobycia. Nowe wyskakuje w dymku w trakcie gry (także na Twoim telefonie w podglądzie), a po grze widać je pod wynikami.",
      },
      {
        icon: "🗂️",
        title: "Galeria osiągnięć",
        text: "Na karcie gracza (dotknij gracza w rankingu) jest kafelek „Osiągnięcia”. W środku zdobyte i te do zdobycia, z postępem. Za dotychczasowe gry już coś na Ciebie czeka!",
      },
    ],
  },
  {
    id: "2026-11-26",
    date: "26 listopada",
    items: [
      {
        icon: "✏️",
        title: "Zmiana nazwy",
        text: "Swoją nazwę zmienisz w Opcjach (zębatka). Organizator może też zmienić nazwę innym w panelu ligi. Nazwy w lidze nie mogą się powtarzać.",
      },
      {
        icon: "👻",
        title: "Nieaktywni gracze",
        text: "Usunięci gracze zostają ze starą nazwą, wyszarzeni w rankingu i liście graczy. Nie da się ich wybrać do nowej gry.",
      },
    ],
  },
  {
    id: "2026-11-24",
    date: "24 listopada",
    items: [
      {
        icon: "🎯",
        title: "Podpowiedź, jak skończyć",
        text: "Gdy da się zamknąć grę, pod wynikiem pojawi się np. „kończ: T20 + D20” – najkrótsza droga do mety.",
      },
      {
        icon: "🟩",
        title: "Pola 1–20 zamiast cyfr",
        text: "W trybie rzutek dotykasz pola, a rzutka zapisuje się od razu. Pod spodem Double, Triple, Pudło, 25 i Bull. Pola, którymi kończysz grę, świecą na zielono.",
      },
      {
        icon: "↶",
        title: "Duży przycisk Cofnij",
        text: "Pomyłka? Jedno dotknięcie cofa ostatnią rzutkę – także z serii, która już się zapisała.",
      },
      {
        icon: "⏱",
        title: "Czas gry",
        text: "Liczymy, ile trwała gra. Przy zwycięzcy widać „+m:ss od mety”, a czasy są na wynikach i w historii.",
      },
      {
        icon: "📊",
        title: "Statystyki ligi",
        text: "Nowy ekran z rekordami, tarczą trafień całej ligi lub wybranego gracza, czasami gier i ulubionymi dniami gry.",
      },
      {
        icon: "⚡",
        title: "Szybszy podgląd na innych telefonach",
        text: "Wynik na telefonach pozostałych graczy odświeża się szybciej i od razu po powrocie do aplikacji.",
      },
    ],
  },
];

export const LATEST_ID = RELEASES[0].id;
export const SEEN_KEY = "dart:whatsNewSeen";

/** Klucze, które świadczą, że na tym telefonie ktoś już korzystał z aplikacji. */
const PAST_USE_KEYS = [
  "dart:game",
  "dart:lastPlayerIds",
  "dart:seenFinished",
  "dart:theme",
  "dart:voice",
  "dart:installHintHidden",
];

/** Wydania, których użytkownik jeszcze nie widział (najnowsze pierwsze). */
export function unseenReleases(seen: string | null): WhatsNewRelease[] {
  if (!seen) return RELEASES;
  return RELEASES.filter((r) => r.id > seen);
}

/**
 * Czy pokazać okno. Nowej osobie (pierwsza wizyta) nie pokazujemy – od razu
 * zapamiętujemy najnowszą wersję. Kto grał przed wprowadzeniem okna
 * (brak znacznika, ale są inne ślady), zobaczy je raz.
 */
export function shouldShow(seen: string | null, usedBefore: boolean): boolean {
  if (seen === null) return usedBefore;
  return unseenReleases(seen).length > 0;
}

export function readSeen(): { seen: string | null; usedBefore: boolean } {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    const usedBefore = PAST_USE_KEYS.some((k) => localStorage.getItem(k) !== null);
    return { seen, usedBefore };
  } catch {
    return { seen: LATEST_ID, usedBefore: false };
  }
}

export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_ID);
  } catch {}
}
