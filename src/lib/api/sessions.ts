import { apiFetch } from "@/lib/api";

export type HistorySession = {
  id: number;
  kind?: "wash" | "charging" | string | null;
  location_id: number;
  address: string | null;
  washer_id?: number | null;
  car_id: number | null;
  car_plate: string | null;
  status: string | null;
  status_ru: string | null;
  payment_id?: number | null;
  payment_amount?: string | number | null;
  payment_description?: string | null;
  amount?: number | null;
  limit_mode?: string | null;
  limit_value?: number | null;
  limit_label?: string | null;
  pistol_id?: number | null;
  pistol_type?: string | null;
  port_label?: string | null;
  charger_id?: number | null;
  charger_type?: string | null;
  charger_power?: number | string | null;
  price_per_kwh?: number | string | null;
  stand_title?: string | null;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number | null;
  entered_at: string | null;
  exited_at: string | null;
  entrance_duration_minutes: number | null;
};

/** @deprecated используй HistorySession */
export type CwSession = HistorySession;

export type HistoryKindFilter = "all" | "wash" | "charging";
export type HistoryPeriodFilter = "all" | "today" | "yesterday" | "7d" | "30d";

export type HistorySessionsQuery = {
  period?: HistoryPeriodFilter;
  status?: string[];
};

type SessionsResponse = {
  total: number;
  sessions: HistorySession[];
};

function buildQuery(params: HistorySessionsQuery = {}): string {
  const search = new URLSearchParams();
  const period = params.period && params.period !== "all" ? params.period : null;
  const statuses = (params.status ?? []).filter(Boolean);

  if (period) search.set("period", period);
  if (statuses.length > 0) search.set("status", statuses.join(","));

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function fetchCwSessions(
  params: HistorySessionsQuery = {},
): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>(`/api/cw/sessions${buildQuery(params)}`);
}

export function fetchEvSessions(
  params: HistorySessionsQuery = {},
): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>(`/api/ev/sessions${buildQuery(params)}`);
}

/** Мойки + ЭЗС, новые сверху. У каждого типа свой period/status. */
export async function fetchAllSessions(
  params: {
    wash?: HistorySessionsQuery;
    charging?: HistorySessionsQuery;
  } = {},
): Promise<{
  total: number;
  sessions: HistorySession[];
}> {
  const wantWash =
    params.wash !== undefined ||
    (params.wash === undefined && params.charging === undefined);
  const wantCharging =
    params.charging !== undefined ||
    (params.wash === undefined && params.charging === undefined);

  const [cw, ev] = await Promise.all([
    wantWash
      ? fetchCwSessions(params.wash ?? {})
      : Promise.resolve({ total: 0, sessions: [] as HistorySession[] }),
    wantCharging
      ? fetchEvSessions(params.charging ?? {})
      : Promise.resolve({ total: 0, sessions: [] as HistorySession[] }),
  ]);

  const sessions = [
    ...cw.sessions.map((s) => ({ ...s, kind: s.kind ?? "wash" })),
    ...ev.sessions.map((s) => ({ ...s, kind: s.kind ?? "charging" })),
  ].sort((a, b) => {
    const ta = a.start_at ? new Date(a.start_at).getTime() : 0;
    const tb = b.start_at ? new Date(b.start_at).getTime() : 0;
    return tb - ta;
  });

  return { total: sessions.length, sessions };
}
