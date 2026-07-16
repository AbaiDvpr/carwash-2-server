import { postToNative } from "./nativeBridge";

export type MessengerApp = "telegram" | "whatsapp";

type OpenMessengerParams = {
  app: MessengerApp;
  url: string;
};

/**
 * Flutter: action "open_messenger", app, url
 * Открывает Telegram / WhatsApp снаружи WebView.
 */
export function openMessenger({ app, url }: OpenMessengerParams): void {
  const sent = postToNative({
    action: "open_messenger",
    app,
    url,
  });

  if (!sent && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function openTelegram(url: string): void {
  openMessenger({ app: "telegram", url });
}

export function openWhatsApp(url: string): void {
  openMessenger({ app: "whatsapp", url });
}
