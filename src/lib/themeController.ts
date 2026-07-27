import type { AppTheme } from "@/lib/theme";
import { postToNative } from "./nativeBridge";

/**
 * Смена темы (Web → Flutter).
 *
 *   { "action": "set_theme", "theme": "light" | "dark" }
 *
 * Flutter:
 *   if (action == 'set_theme') {
 *     final theme = payload['theme'] as String?; // light | dark
 *     // сохранить и применить нативный UI (AppBar, status bar, …)
 *   }
 */
export function notifyThemeChanged(theme: AppTheme): boolean {
  return postToNative({
    action: "set_theme",
    theme,
  });
}
