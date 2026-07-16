import {
  hasNativeBridge,
  postToNative,
  subscribeNativeMessage,
} from "./nativeBridge";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

const LOCATION_TIMEOUT_MS = 20_000;

function requestFromBrowser(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation_unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(err.message || "geolocation_denied"));
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: 15_000,
      },
    );
  });
}

/**
 * Flutter WebView:
 *   Web → Native:  { "action": "get_location", "request_id": "..." }
 *   Native → Web:  window.CarWashNativeReceive(JSON.stringify({
 *     "action": "location",
 *     "request_id": "...",
 *     "latitude": 43.23,
 *     "longitude": 76.88
 *   }))
 *   или ошибка: { "action": "location", "request_id": "...", "error": "denied" }
 *
 * В браузере без моста — navigator.geolocation.
 */
function requestFromNative(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
      fn();
    };

    const unsubscribe = subscribeNativeMessage((payload) => {
      if (payload.action !== "location") return;
      if (payload.request_id != null && String(payload.request_id) !== requestId) {
        return;
      }

      if (payload.error) {
        finish(() => reject(new Error(String(payload.error))));
        return;
      }

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        finish(() => reject(new Error("invalid_coords")));
        return;
      }

      finish(() => resolve({ latitude, longitude }));
    });

    const timeoutId = window.setTimeout(() => {
      finish(() => {
        // Flutter ещё не ответил — пробуем браузерный API в WebView
        requestFromBrowser().then(resolve, reject);
      });
    }, LOCATION_TIMEOUT_MS);

    const sent = postToNative({
      action: "get_location",
      request_id: requestId,
    });

    if (!sent) {
      finish(() => {
        requestFromBrowser().then(resolve, reject);
      });
    }
  });
}

/** Текущая геопозиция: в приложении через Flutter, иначе через браузер. */
export function getUserLocation(): Promise<UserLocation> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }

  if (hasNativeBridge()) {
    return requestFromNative();
  }

  return requestFromBrowser();
}
