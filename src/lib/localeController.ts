import type { AppLocale } from "@/lib/i18n/storage";
import { postToNative } from "./nativeBridge";

/**
 * Смена языка (Web → Flutter).
 *
 *   { "action": "set_locale", "locale": "ru" | "kz" | "en" }
 *
 * Flutter:
 *   if (action == 'set_locale') {
 *     final locale = payload['locale'] as String?; // ru | kz | en
 *     // сохранить и применить нативный UI
 *   }
 */
export function notifyLocaleChanged(locale: AppLocale): boolean {
  return postToNative({
    action: "set_locale",
    locale,
  });
}
