import {
  ensureNativeReceiveInstalled,
  subscribeNativeMessage,
} from "./nativeBridge";

export type OpenStationKind = "charging" | "wash";

export type OpenStationRequest = {
  id: string;
  type: OpenStationKind | null;
};

type Listener = (request: OpenStationRequest) => void;

const listeners = new Set<Listener>();
let pending: OpenStationRequest | null = null;
let installed = false;

/** Deep link / Flutter: type=ev|cw|charging|wash */
export function parseOpenStationType(raw: unknown): OpenStationKind | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "ev" || v === "charging") return "charging";
  if (v === "cw" || v === "wash") return "wash";
  return null;
}

function emit(request: OpenStationRequest): void {
  pending = request;
  listeners.forEach((listener) => listener(request));
}

function handleNativePayload(payload: Record<string, unknown>): void {
  const action = String(payload.action ?? "").trim().toLowerCase();
  if (action !== "open_station" && action !== "open_drawer") return;

  const rawId =
    (typeof payload.id === "string" && payload.id.trim()) ||
    (typeof payload.station === "string" && payload.station.trim()) ||
    (typeof payload.id === "number" ? String(payload.id) : "") ||
    "";

  if (!rawId) return;

  emit({
    id: rawId,
    type: parseOpenStationType(payload.type),
  });
}

/** Ставит слушатель Flutter → Web один раз. */
export function ensureOpenStationListenerInstalled(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  ensureNativeReceiveInstalled();
  subscribeNativeMessage(handleNativePayload);
}

export function peekPendingOpenStation(): OpenStationRequest | null {
  return pending;
}

export function clearPendingOpenStation(): void {
  pending = null;
}

export function subscribeOpenStation(listener: Listener): () => void {
  ensureOpenStationListenerInstalled();
  listeners.add(listener);
  if (pending) listener(pending);
  return () => {
    listeners.delete(listener);
  };
}
