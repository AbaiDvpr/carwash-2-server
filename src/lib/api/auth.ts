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
  console.log("counter");
  setUserId(data.user.id);
  cacheUserProfile(data.user);
  return data.user;
}
