import { apiFetch } from "@/lib/api";
import { setAccessToken, setUserId } from "@/lib/authToken";
import { cacheUserProfile } from "@/lib/userSession";

export type AuthUser = {
  id: number;
  phone: string;
  email: string | null;
  name: string;
  last_name: string | null;
  balance: string | number;
  photo_url: string | null;
  push_enabled: boolean;
  geo_id: number | null;
  referral_code?: string | null;
  referred_by_user_id?: number | null;
  has_referrer?: boolean;
  referral_clients_count?: number;
  referred_at?: string | null;
  referral_bonus_paid_at?: string | null;
};

type AuthResponse = {
  message: string;
  token_type: string;
  access_token: string;
  user: AuthUser;
};

type UserInfoResponse = {
  user: AuthUser;
};

function persistSession(accessToken: string, user: AuthUser): void {
  setAccessToken(accessToken);
  setUserId(user.id);
  cacheUserProfile(user);
}

export async function loginWithPhone(phone: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    requireAuth: false,
    body: JSON.stringify({ phone, password }),
  });
  persistSession(data.access_token, data.user);
  return data.user;
}

export async function fetchUserInfo(): Promise<AuthUser> {
  const data = await apiFetch<UserInfoResponse>("/api/auth/user_info");
  setUserId(data.user.id);
  // Не затираем локальный email пустым ответом (гонка со stale GET после анкеты)
  cacheUserProfile(data.user, { preserveEmailIfEmpty: true });
  return data.user;
}

type UpdateSettingsResponse = {
  message: string;
  user: AuthUser;
};

export async function updateUserSettings(settings: {
  push_enabled?: boolean;
  name?: string;
  last_name?: string | null;
  email?: string | null;
  geo_id?: number | null;
}): Promise<AuthUser> {
  const data = await apiFetch<UpdateSettingsResponse>("/api/auth/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
  const merged: AuthUser = {
    ...data.user,
    name: data.user.name?.trim() || settings.name || data.user.name,
    last_name:
      data.user.last_name?.trim() ||
      (settings.last_name !== undefined ? settings.last_name : data.user.last_name),
    email:
      data.user.email?.trim() ||
      (typeof settings.email === "string" ? settings.email.trim() : null) ||
      data.user.email,
  };
  cacheUserProfile(merged);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
  return merged;
}
