# Dart – licznik punktów

Prosta aplikacja webowa do prowadzenia rozgrywek w darta „do równego” (np. 101).
Projektowana pod telefon: duże przyciski, ciemny motyw, jedna kolumna.

## Uruchomienie lokalnie

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testy logiki gry
npm run build   # build produkcyjny
```

Ligi i ranking potrzebują Postgresa w zmiennej `DATABASE_URL` (albo `POSTGRES_URL`).
Tabele zakładają się same przy pierwszym zapytaniu. Testy bazy uruchomisz tak:

```bash
TEST_DATABASE_URL=postgres://... npm test
```

## Ligi

- **Załóż ligę**: nazwa ligi + Twoja nazwa. Zakładający zostaje organizatorem.
- **Zaproszenie**: link `/dolacz/KOD` lub kod QR z ekranu „Liga”. Nowy gracz podaje tylko nazwę.
- **Bez kont i haseł**: telefon dostaje losowy identyfikator w ciasteczku, więc przy kolejnym
  wejściu liga otwiera się sama.
- **Nowy telefon**: organizator dotyka gracza i wysyła mu link „Nowy telefon” (działa raz, 48 h).
- Organizator może dodać gracza bez telefonu i przekazać rolę organizatora.
- Gry i ranking (ostatnie 10 gier) są wspólne dla całej ligi.

## Podgląd na żywo

Punkty wpisuje jeden telefon (ten, który rozpoczął grę). Po każdej serii wysyła
stan gry do bazy (`live_games`). Pozostali gracze widzą na starcie baner „Trwa gra”
albo „Twoja kolej!”, a po dotknięciu podgląd `/na-zywo/[id]`. Telefony pytają
serwer co 2,5–3 s i tylko wtedy, gdy ekran jest włączony. Po końcu gry podgląd
pokazuje klasyfikację, a start ranking i „Twoje ostatnie gry”.

## Struktura

| Ścieżka | Co tam jest |
| --- | --- |
| `src/app/` | Ekrany (Next.js App Router): start `/`, gra `/gra`, liga `/liga`, dołączanie `/dolacz/[kod]`, nowy telefon `/przypisz/[token]`, API w `src/app/api/` |
| `src/components/league/` | Ekrany ligi: zakładanie, dołączanie, panel organizatora |
| `src/lib/server/` | Baza (schemat, zapytania) i logika ligi po stronie serwera |
| `src/components/game/` | Ekrany gry: ustawienia, rozgrywka z klawiaturą, klasyfikacja |
| `src/components/ui/` | Wspólne elementy UI (przyciski, nagłówek) |
| `src/lib/game/` | Logika gry niezależna od UI: kolejka, „zostało X”, przekroczenie = seria się nie liczy, gra do ostatniego miejsca, historia i ranking |

Logika w `src/lib/game` nie zależy od Reacta ani bazy, więc posłuży
też przy zapisie gier do bazy i podglądzie na żywo.

## Plan

1. ✅ Szkielet aplikacji
2. ✅ Rozgrywka na jednym telefonie: gracze, kolejność, cel, wpis serii, „zostało X”
3. ✅ Ligi i zapis gier w bazie (Neon Postgres)
4. ✅ Podgląd gry na żywo dla pozostałych graczy

## Wdrożenie na Vercel

1. Wejdź na https://vercel.com/new i zaimportuj repozytorium `bartekc7/Dart`.
2. Vercel sam rozpozna Next.js, nie trzeba nic zmieniać. Kliknij **Deploy**.
3. Każdy pull request dostanie własny podgląd, a merge do `main` wdroży wersję produkcyjną.

### Podłączenie bazy (jednorazowo)

1. Vercel → projekt **dart** → zakładka **Storage** → **Create Database** → **Neon** → **Continue**.
2. Wybierz region (np. Frankfurt), zatwierdź i przy pytaniu o projekt zaznacz **dart**
   (wszystkie środowiska). Vercel sam doda `DATABASE_URL`.
3. Zakładka **Deployments** → przy najnowszym wdrożeniu **⋯ → Redeploy**.
