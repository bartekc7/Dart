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

## Struktura

| Ścieżka | Co tam jest |
| --- | --- |
| `src/app/` | Ekrany (Next.js App Router): start `/`, gra `/gra` |
| `src/components/game/` | Ekrany gry: ustawienia, rozgrywka z klawiaturą, klasyfikacja |
| `src/components/ui/` | Wspólne elementy UI (przyciski, nagłówek) |
| `src/lib/game/` | Logika gry niezależna od UI: kolejka, „zostało X”, przekroczenie = seria się nie liczy, gra do ostatniego miejsca |

Logika w `src/lib/game` nie zależy od Reacta ani bazy, więc posłuży
też przy zapisie gier do bazy i podglądzie na żywo.

## Plan

1. ✅ Szkielet aplikacji
2. ✅ Rozgrywka na jednym telefonie: gracze, kolejność, cel, wpis serii, „zostało X”
3. Zapis gier w bazie (Neon Postgres)
4. Opcjonalnie: podgląd na żywo na telefonach graczy

## Wdrożenie na Vercel

1. Wejdź na https://vercel.com/new i zaimportuj repozytorium `bartekc7/Dart`.
2. Vercel sam rozpozna Next.js, nie trzeba nic zmieniać. Kliknij **Deploy**.
3. Każdy pull request dostanie własny podgląd, a merge do `main` wdroży wersję produkcyjną.
