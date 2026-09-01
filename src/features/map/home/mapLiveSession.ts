import type { EvChargeStep } from "@/features/home/components/EvChargeFlow";
import {
  evStationIdFromLocation,
  plannedEndAtMs,
  type EvSession,
} from "@/lib/api/evSessions";

export type MapLiveSession = {
  kind: "wash" | "charging";
  /** ID сессии в БД (ev_sessions.id) */
  dbSessionId: number;
  stationId: string;
  stationName: string;
  address: string;
  standId: number;
  portId: number;
  step: EvChargeStep;
  chargeEndsAt: number | null;
};

export function detailsChargingPath(sessionId: number): string {
  return `/details-charging/${sessionId}`;
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

/** Самая свежая активная (для resume / совместимости) */
export function pickPrimaryActiveSession(
  sessions: EvSession[],
): MapLiveSession | null {
  return mapActiveEvSessions(sessions)[0] ?? null;
}
