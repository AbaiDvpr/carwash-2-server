import { hasNativeBridge, postToNative } from "./nativeBridge";

/**
 * Копирование текста.
 * Flutter: { "action": "copy_text", "text": "..." }
 * Без bridge — navigator.clipboard / fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (hasNativeBridge()) {
    return postToNative({
      action: "copy_text",
      text: value,
    });
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
