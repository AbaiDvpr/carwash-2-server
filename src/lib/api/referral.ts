import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/api/auth";
import { cacheUserProfile } from "@/lib/userSession";

export type ReferralClient = {
  id: number;
  referred_at: string | null;
  bonus_paid: boolean;
};

type ApplyResponse = {
  message: string;
  user: AuthUser;
};

type ClientsResponse = {
  total: number;
  clients: ReferralClient[];
};

function persistUser(user: AuthUser): AuthUser {
  cacheUserProfile(user);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
  return user;
}

export async function applyReferralCode(code: string): Promise<ApplyResponse> {
  const data = await apiFetch<ApplyResponse>("/api/referral/apply", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  persistUser(data.user);
  return data;
}

export async function fetchReferralClients(): Promise<ClientsResponse> {
  return apiFetch<ClientsResponse>("/api/referral/clients");
}

export function referralErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body as
      | { message?: string; errors?: Record<string, string[]> }
      | null;
    const field = body?.errors?.code?.[0];
    if (field) return field;
    if (body?.message) return body.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
