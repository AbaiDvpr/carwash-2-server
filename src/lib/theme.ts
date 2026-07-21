import { applyThemePalette } from "@/lib/themeColors";

export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "carwash-theme-change";

const DEFAULT_THEME: AppTheme = "light";

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}

export function readTheme(): AppTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;

  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(raw) ? raw : DEFAULT_THEME;
}

let themeSwitchTimer: number | null = null;

/**
 * Применяет тему к <html>. Не зависит от системного dark mode телефона.
 * На время смены глушим CSS-transition — иначе блоки «мигают» по очереди.
 */
export function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  applyThemePalette(theme);

  if (themeSwitchTimer != null) {
    window.clearTimeout(themeSwitchTimer);
  }

  // Два кадра: тема уже нарисована, потом снова разрешаем transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      themeSwitchTimer = window.setTimeout(() => {
        root.classList.remove("theme-switching");
        themeSwitchTimer = null;
      }, 50);
    });
  });
}

export function setTheme(theme: AppTheme): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function toggleTheme(): AppTheme {
  const next: AppTheme = readTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
