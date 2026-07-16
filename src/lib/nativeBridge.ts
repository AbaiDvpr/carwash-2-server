type NativeMessageHandler = (payload: Record<string, unknown>) => void;

declare global {
  interface Window {
    CarWashApp?: {
      isNative?: boolean;
      /** Flutter → Web: сырой JSON или объект */
      receiveMessage?: (message: string | Record<string, unknown>) => void;
    };
    CarWashNative?: {
      postMessage: (message: string) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    /** Flutter → Web (основной колбэк) */
    CarWashNativeReceive?: (message: string | Record<string, unknown>) => void;
  }
}

const handlers = new Set<NativeMessageHandler>();
let receiveInstalled = false;

function parseNativeMessage(
  message: string | Record<string, unknown>,
): Record<string, unknown> | null {
  if (typeof message === "object" && message != null) {
    return message as Record<string, unknown>;
  }
  if (typeof message !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(message);
    if (typeof parsed === "object" && parsed != null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function dispatchNativeMessage(message: string | Record<string, unknown>): void {
  const payload = parseNativeMessage(message);
  if (!payload) return;
  handlers.forEach((handler) => handler(payload));
  window.dispatchEvent(
    new CustomEvent("carwash-native-message", { detail: payload }),
  );
}

/** Вешает глобальный приёмник — Flutter вызывает его после get_location и др. */
export function ensureNativeReceiveInstalled(): void {
  if (typeof window === "undefined" || receiveInstalled) return;
  receiveInstalled = true;

  window.CarWashNativeReceive = dispatchNativeMessage;
  window.CarWashApp = {
    ...window.CarWashApp,
    receiveMessage: dispatchNativeMessage,
  };
}

export function subscribeNativeMessage(handler: NativeMessageHandler): () => void {
  ensureNativeReceiveInstalled();
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function hasNativeBridge(): boolean {
  if (typeof window === "undefined") return false;

  if (window.CarWashApp?.isNative === true) return true;

  return Boolean(window.CarWashNative?.postMessage ?? window.ReactNativeWebView?.postMessage);
}

export function postToNative(payload: Record<string, unknown>): boolean {
  if (typeof window === "undefined") return false;

  ensureNativeReceiveInstalled();

  const bridge = window.CarWashNative ?? window.ReactNativeWebView;
  if (!bridge?.postMessage) return false;

  bridge.postMessage(JSON.stringify(payload));
  return true;
}

/** @deprecated используй hasNativeBridge() */
export function isNativeApp(): boolean {
  return hasNativeBridge();
}
