import { postToNative } from "./nativeBridge";

/**
 * Полноэкранный режим для сторис / модалок (скрыть header + bottom navbar,
 * edge-to-edge — Flutter убирает и top SafeArea).
 *
 * Web → Native:
 *   { "action": "fullscreen", "enabled": true }
 *   { "action": "fullscreen", "enabled": false }
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

/**
 * Full-size шторки станции на карте (фото на весь экран).
 * НЕ то же самое, что `fullscreen` у сторис:
 * Flutter прячет bottom nav (и при необходимости AppBar),
 * но top SafeArea / status bar НЕ снимает.
 *
 * Web → Native:
 *   { "action": "map_fullscreen", "enabled": true }
 *   { "action": "map_fullscreen", "enabled": false }
 */
export function setMapFullscreen(enabled: boolean): boolean {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("map-fullscreen", enabled);
  }

  return postToNative({
    action: "map_fullscreen",
    enabled,
  });
}

export function enterMapFullscreen(): boolean {
  return setMapFullscreen(true);
}

export function exitMapFullscreen(): boolean {
  return setMapFullscreen(false);
}
