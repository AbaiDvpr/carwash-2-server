import { postToNative } from "./nativeBridge";

export type VibratePattern = "invite" | "default";

/**
 * Web → Flutter: вибрация устройства.
 *
 *   { "action": "vibrate", "pattern": "invite" }
 *
 * Flutter: HapticFeedback / Vibration при action == "vibrate".
 * В браузере без bridge — navigator.vibrate, если доступно.
 */
export function vibrate(pattern: VibratePattern = "default"): boolean {
  const sent = postToNative({
    action: "vibrate",
    pattern,
  });

  if (!sent && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    // invite: чуть длиннее импульс
    navigator.vibrate(pattern === "invite" ? [200, 80, 200] : 200);
    return true;
  }

  return sent;
}
