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

type SessionsResponse = {
  total: number;
  sessions: HistorySession[];
};

export function fetchCwSessions(): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>("/api/cw/sessions");
}

export function fetchEvSessions(): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>("/api/ev/sessions");
}

/** Мойки + ЭЗС, новые сверху */
export async function fetchAllSessions(): Promise<{
  total: number;
  sessions: HistorySession[];
}> {
  const [cw, ev] = await Promise.all([fetchCwSessions(), fetchEvSessions()]);

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
