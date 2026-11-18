export type Theme = "system" | "light" | "dark";

export const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: "system", label: "Systemowy", hint: "jak w telefonie" },
  { value: "light", label: "Jasny", hint: "" },
  { value: "dark", label: "Ciemny", hint: "" },
];

export const THEME_KEY = "dart:theme";

export function isTheme(v: unknown): v is Theme {
  return v === "system" || v === "light" || v === "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Uruchamiany w <head> przed narysowaniem strony, żeby nie było mignięcia
 * złym motywem przy starcie.
 */
export const themeInitScript = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})||'"system"');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'system'}catch(e){}`;
