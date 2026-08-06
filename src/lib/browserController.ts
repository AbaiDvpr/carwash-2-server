import { postToNative } from "./nativeBridge";

/**
 * Flutter: action "open_browser", url
 * Открывает ссылку во внешнем браузере (вне WebView).
 * Без bridge — fallback на window.open.
 */
export function openBrowser(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;

  const sent = postToNative({
    action: "open_browser",
    url: trimmed,
  });

  if (!sent && typeof window !== "undefined") {
    window.open(trimmed, "_blank", "noopener,noreferrer");
  }
}
