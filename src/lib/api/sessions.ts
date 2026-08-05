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
  kind?: HistoryKindFilter;
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

/** Мойки + ЭЗС, новые сверху. kind/period/status уходят в API. */
export async function fetchAllSessions(
  params: HistorySessionsQuery = {},
): Promise<{
  total: number;
  sessions: HistorySession[];
}> {
  const kind = params.kind ?? "all";
  const shared = { period: params.period, status: params.status };

  const [cw, ev] = await Promise.all([
    kind === "charging" ? Promise.resolve({ total: 0, sessions: [] as HistorySession[] }) : fetchCwSessions(shared),
    kind === "wash" ? Promise.resolve({ total: 0, sessions: [] as HistorySession[] }) : fetchEvSessions(shared),
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
