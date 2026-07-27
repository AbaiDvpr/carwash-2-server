import { postToNative } from "./nativeBridge";

/**
 * Полноэкранный режим (скрыть/показать header + bottom navbar).
 *
 * Web → Native:
 *   { "action": "fullscreen", "enabled": true }   // сторис открыт
 *   { "action": "fullscreen", "enabled": false }  // сторис закрыт
 *
 * Flutter:
 *   if (action == 'fullscreen') {
 *     final enabled = payload['enabled'] == true;
 *     setState(() {
 *       showAppBar = !enabled;
 *       showBottomNav = !enabled;
 *     });
 *   }
 *
 * В браузере без bridge — класс `fullscreen` на <html>.
 */
export function setFullscreen(enabled: boolean): boolean {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("fullscreen", enabled);
  }

  return postToNative({
    action: "fullscreen",
    enabled,
  });
}

export function enterFullscreen(): boolean {
  return setFullscreen(true);
}

export function exitFullscreen(): boolean {
  return setFullscreen(false);
}
