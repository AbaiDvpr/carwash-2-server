import { apiFetch } from "@/lib/api";

export type EvSessionLimitMode = "price" | "charge" | "time";

export type EvSessionMeta = {
  stand_title?: string | null;
  port_label?: string | null;
  pistol_type?: string | null;
  power_kw?: number | null;
  price_per_kwh?: number | null;
  charger_type?: string | null;
  address?: string | null;
  station_name?: string | null;
  car_plate?: string | null;
  duration_seconds?: number | null;
  planned_end_at?: string | null;
  limit_mode?: string | null;
  limit_value?: number | null;
  amount?: number | null;
};

export type EvSession = {
  id: number;
  location_id: number;
  address: string | null;
  pistol_id: number | null;
  charger_id: number | null;
  status: string | null;
  status_ru: string | null;
  limit_mode: EvSessionLimitMode | null;
  limit_value: number | null;
  limit_label: string | null;
  amount: number | null;
  stand_title?: string | null;
  port_label?: string | null;
  pistol_type?: string | null;
  charger_type?: string | null;
  charger_power?: number | string | null;
  price_per_kwh?: number | string | null;
  car_plate?: string | null;
  duration_seconds?: number | null;
  planned_end_at?: string | null;
  meta?: EvSessionMeta | null;
  payment_id: number | null;
  payment_amount?: number | string | null;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number | null;
};

export type StartEvSessionInput = {
  location_id: number;
  pistol_id: number;
  charger_id?: number | null;
  car_id?: number | null;
  limit_mode: EvSessionLimitMode;
  limit_value: number;
  amount: number;
  duration_seconds?: number;
  meta?: EvSessionMeta;
};

export async function startEvSession(
  input: StartEvSessionInput,
): Promise<EvSession> {
  const data = await apiFetch<{ session: EvSession }>("/api/ev/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.session;
}

export async function updateEvSession(
  id: number,
  input: {
    status: "charging" | "pending" | "completed" | "cancelled" | "error";
    end_at?: string;
    amount?: number;
  },
): Promise<EvSession> {
  const data = await apiFetch<{ session: EvSession }>(`/api/ev/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.session;
}

export async function fetchEvSession(id: number): Promise<EvSession> {
  const data = await apiFetch<{ session: EvSession }>(`/api/ev/sessions/${id}`);
  return data.session;
}

export async function fetchActiveEvSessions(): Promise<EvSession[]> {
  const data = await apiFetch<{ sessions: EvSession[] }>(
    "/api/ev/sessions/active",
  );
  return data.sessions ?? [];
}

export function evStationIdFromLocation(locationId: number): string {
  return `ev-${locationId}`;
}

export function plannedEndAtMs(session: EvSession): number | null {
  const planned = session.planned_end_at ?? session.meta?.planned_end_at;
  if (planned) {
    const ms = Date.parse(planned);
    if (Number.isFinite(ms)) return ms;
  }
  if (session.start_at && session.duration_seconds) {
    const start = Date.parse(session.start_at);
    if (Number.isFinite(start)) return start + session.duration_seconds * 1000;
  }
  return null;
}
