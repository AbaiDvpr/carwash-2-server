import { apiFetch } from "@/lib/api";

export type CwSession = {
  id: number;
  location_id: number;
  address: string | null;
  washer_id: number;
  car_id: number;
  car_plate: string | null;
  status: string | null;
  status_ru: string | null;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number | null;
  entered_at: string | null;
  exited_at: string | null;
  entrance_duration_minutes: number | null;
};

type SessionsResponse = {
  total: number;
  sessions: CwSession[];
};

export function fetchCwSessions(): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>("/api/cw/sessions");
}
