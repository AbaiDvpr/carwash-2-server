declare global {
  interface Window {
    CarWashApp?: {
      isNative?: boolean;
    };
    CarWashNative?: {
      postMessage: (message: string) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export function hasNativeBridge(): boolean {
  if (typeof window === "undefined") return false;

  if (window.CarWashApp?.isNative === true) return true;

  return Boolean(window.CarWashNative?.postMessage ?? window.ReactNativeWebView?.postMessage);
}

export function postToNative(payload: Record<string, unknown>): boolean {
  if (typeof window === "undefined") return false;

  const bridge = window.CarWashNative ?? window.ReactNativeWebView;
  if (!bridge?.postMessage) return false;

  bridge.postMessage(JSON.stringify(payload));
  return true;
}

/** @deprecated используй hasNativeBridge() */
export function isNativeApp(): boolean {
  return hasNativeBridge();
}
