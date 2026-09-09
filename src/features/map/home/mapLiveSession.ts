import type { EvChargeStep } from "@/features/map/home/components/EvChargeFlow";
import {
  evStationIdFromLocation,
  plannedEndAtMs,
  type EvSession,
} from "@/lib/api/evSessions";
import type { HistorySession } from "@/lib/api/sessions";

export type MapLiveSession = {
  kind: "wash" | "charging";
  /** ID сессии в БД */
  dbSessionId: number;
  stationId: string;
  stationName: string;
  address: string;
  standId: number;
  portId: number;
  step: EvChargeStep;
  chargeEndsAt: number | null;
  /** Сырой статус CW/EV (pending / invited / in_progress / …) */
  statusCode?: string | null;
  washerId?: number | null;
};

export function detailsChargingPath(sessionId: number): string {
  return `/details-charging/${sessionId}`;
}

export function washSessionPath(locationId: number | string, sessionId: number): string {
  return `/payment/car-wash/${locationId}?session=${sessionId}`;
}

export function mapEvSessionToLive(session: EvSession): MapLiveSession | null {
  if (!session?.id || session.location_id == null) return null;

  const status = session.status ?? "";
  let step: EvChargeStep = "charging";
  if (status === "pending" || status === "completed") {
    step = "charged_ok";
  } else if (status === "charging" || status === "in_progress") {
    step = "charging";
  } else {
    return null;
  }

  const endsAt = step === "charging" ? plannedEndAtMs(session) : null;

  return {
    kind: "charging",
    dbSessionId: session.id,
    stationId: evStationIdFromLocation(session.location_id),
    stationName:
      session.meta?.station_name ??
      session.address ??
      `ЭЗС #${session.location_id}`,
    address: session.address ?? session.meta?.address ?? "",
    standId: session.charger_id ?? 0,
    portId: session.pistol_id ?? 0,
    step,
    chargeEndsAt: endsAt,
    statusCode: status || null,
  };
}

/** Все активные зарядки из ответа API */
export function mapActiveEvSessions(sessions: EvSession[]): MapLiveSession[] {
  const out: MapLiveSession[] = [];
  for (const session of sessions) {
    const live = mapEvSessionToLive(session);
    if (live) out.push(live);
  }
  return out;
}

export function mapCwSessionToLive(session: HistorySession): MapLiveSession | null {
  if (!session?.id || session.location_id == null) return null;

  const status = (session.status ?? "").toLowerCase();
  if (status === "completed") return null;

  // «Активная» мойка — всё, что ещё не закрыто.
  const active =
    status === "pending" ||
    status === "invited" ||
    status === "in_progress" ||
    status === "error" ||
    status === "cancelled" ||
    !session.end_at;

  if (!active && session.end_at) return null;

  return {
    kind: "wash",
    dbSessionId: session.id,
    stationId: String(session.location_id),
    stationName: session.address ?? `Мойка #${session.location_id}`,
    address: session.address ?? "",
    standId: session.washer_id ?? 0,
    portId: 0,
    step: status === "in_progress" ? "charging" : "charging",
    chargeEndsAt: null,
    statusCode: status || "pending",
    washerId: session.washer_id ?? null,
  };
}

export function mapActiveCwSessions(sessions: HistorySession[]): MapLiveSession[] {
  const out: MapLiveSession[] = [];
  for (const session of sessions) {
    const live = mapCwSessionToLive(session);
    if (live) out.push(live);
  }
  return out;
}

/** Самая свежая активная (для resume / совместимости) */
export function pickPrimaryActiveSession(
  sessions: EvSession[],
): MapLiveSession | null {
  return mapActiveEvSessions(sessions)[0] ?? null;
}
