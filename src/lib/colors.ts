/**
 * Kolory graczy. Gracz wybiera kolor albo ikonkę (lib/looks); bez wyboru
 * dostaje kolor według kolejności dołączenia (pierwszy wolny). Odcienie są
 * na tyle ciemne, że biały tekst na nich jest czytelny w obu motywach.
 */
export const PLAYER_COLORS = [
  "#2563eb", // niebieski
  "#16a34a", // zielony
  "#ea580c", // pomarańczowy
  "#9333ea", // fioletowy
  "#0d9488", // morski
  "#db2777", // różowy
  "#ca8a04", // złoty
  "#dc2626", // czerwony
  "#4f46e5", // indygo
  "#0891b2", // turkusowy
] as const;

/** Tło i obwódka gracza z ikonką (ikonka zastępuje kolor, więc akcent jest neutralny). */
export const ICON_ACCENT = "#475569";

/** Kolor gracza po numerze; -1 = gracz z ikonką (neutralny akcent). */
export function playerColor(index: number | undefined): string {
  if (index === -1) return ICON_ACCENT;
  if (index === undefined || !Number.isInteger(index) || index < 0) return PLAYER_COLORS[0];
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

/** Tło karty „kto rzuca” w kolorze gracza (gradient jak wcześniej czerwony). */
export function accentBackground(color: string) {
  return {
    backgroundImage: `linear-gradient(to bottom right, ${color}, color-mix(in oklab, ${color} 72%, black))`,
    boxShadow: `0 10px 15px -3px color-mix(in oklab, ${color} 25%, transparent)`,
  };
}

/** Wiersz gracza, który teraz rzuca: lekko zabarwione tło i obwódka w jego kolorze. */
export function activeRowStyle(color: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 14%, var(--c-surface))`,
    boxShadow: `inset 0 0 0 2px ${color}`,
  };
}
