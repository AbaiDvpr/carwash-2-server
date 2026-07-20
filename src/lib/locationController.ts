import {
  hasNativeBridge,
  postToNative,
  subscribeNativeMessage,
} from "./nativeBridge";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

/** Кэш геопозиции живёт 5 минут — повторные открытия карты/списка не дергают native. */
export const LOCATION_TTL_MS = 5 * 60 * 1000;

const LOCATION_TIMEOUT_MS = 20_000;
const LOCATION_POLL_MS = LOCATION_TTL_MS;
const LOCATION_CHANGE_EVENT = "carwash-user-location";

type CachedLocation = {
  location: UserLocation;
  at: number;
};

let cached: CachedLocation | null = null;
let inflight: Promise<UserLocation> | null = null;
let pollTimer: number | null = null;
let pollingStarted = false;

export type LocationStatus = "idle" | "loading" | "ready" | "unavailable";

type LocationListener = (location: UserLocation | null) => void;
type StatusListener = (status: LocationStatus) => void;

const listeners = new Set<LocationListener>();
const statusListeners = new Set<StatusListener>();

let locationStatus: LocationStatus = "idle";

function emitStatus(next: LocationStatus): void {
  if (locationStatus === next) return;
  locationStatus = next;
  statusListeners.forEach((listener) => listener(next));
}

export function getLocationStatus(): LocationStatus {
  return locationStatus;
}

export function subscribeLocationStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(locationStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function emit(location: UserLocation | null): void {
  listeners.forEach((listener) => listener(location));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LOCATION_CHANGE_EVENT, { detail: location }),
    );
  }
}

function setCache(location: UserLocation): UserLocation {
  cached = { location, at: Date.now() };
  emitStatus("ready");
  emit(location);
  return location;
}

function isCacheFresh(maxAgeMs = LOCATION_TTL_MS): boolean {
  return Boolean(cached && Date.now() - cached.at < maxAgeMs);
}

/** Последняя известная точка без запроса (или null). */
export function getCachedUserLocation(): UserLocation | null {
  return cached?.location ?? null;
}

export function getCachedUserLocationAgeMs(): number | null {
  if (!cached) return null;
  return Date.now() - cached.at;
}

export function subscribeUserLocation(listener: LocationListener): () => void {
  listeners.add(listener);
  listener(cached?.location ?? null);
  return () => {
    listeners.delete(listener);
  };
}

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
        maximumAge: LOCATION_TTL_MS,
      },
    );
  });
}

/**
 * Flutter WebView:
 *   Web → Native:  { "action": "get_location", "request_id": "..." }
 *   Native → Web:  window.CarWashNativeReceive(...)
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

function fetchUserLocation(): Promise<UserLocation> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }

  if (hasNativeBridge()) {
    return requestFromNative();
  }

  return requestFromBrowser();
}

export type GetUserLocationOptions = {
  /** true — всегда новый запрос (кнопка «моя точка» на карте) */
  force?: boolean;
};

/**
 * Геопозиция с кэшем 5 минут.
 * Параллельные вызовы делят один inflight-запрос.
 */
export function getUserLocation(
  options: GetUserLocationOptions = {},
): Promise<UserLocation> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }

  if (!options.force && isCacheFresh()) {
    emitStatus("ready");
    return Promise.resolve(cached!.location);
  }

  if (inflight) return inflight;

  if (!cached) {
    emitStatus("loading");
  }

  inflight = fetchUserLocation()
    .then((location) => setCache(location))
    .catch((err) => {
      emitStatus(cached ? "ready" : "unavailable");
      throw err;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function pollOnce(): Promise<void> {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }

  try {
    await getUserLocation({ force: true });
  } catch {
    // тихо: кэш остаётся прежним
  }
}

/**
 * Фоновый опрос раз в 5 минут, пока вкладка/WebView видимы.
 * Вызвать один раз при старте приложения.
 */
export function ensureLocationPolling(): void {
  if (typeof window === "undefined" || pollingStarted) return;
  pollingStarted = true;

  if (isCacheFresh()) {
    emitStatus("ready");
  } else {
    emitStatus("loading");
  }

  void pollOnce();

  pollTimer = window.setInterval(() => {
    void pollOnce();
  }, LOCATION_POLL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!isCacheFresh()) {
        void pollOnce();
      }
    }
  });
}

/** @deprecated */
export function isNativeApp(): boolean {
  return hasNativeBridge();
}
