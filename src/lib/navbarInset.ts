/** Flutter пишет в localStorage только высоту навбара (логические px). */
export const NAVBAR_H_STORAGE_KEY = "navbar_h";

const MAX_NAVBAR_H_PX = 240;
/** Зазор над навбаром: Flutter шлёт 88 → фактически 108. */
const NAVBAR_EXTRA_GAP_PX = 20;

export function readNavbarHeightPx(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(NAVBAR_H_STORAGE_KEY);
  const value = Number.parseFloat(raw ?? "");
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, MAX_NAVBAR_H_PX) + NAVBAR_EXTRA_GAP_PX;
}

/**
 * Ставит --app-navbar-native-h. `enabled: false` — старый режим (высота 0).
 * Навбар скрыт (`fullscreen` / `map-fullscreen`) обнуляет --app-navbar-h в CSS.
 */
export function applyNavbarInset(enabled: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const px = enabled ? readNavbarHeightPx() : 0;
  root.style.setProperty("--app-navbar-native-h", `${px}px`);
  if (enabled) {
    root.setAttribute("data-navbar-source", "true");
    return;
  }
  root.removeAttribute("data-navbar-source");
}
