export const USER_EMAIL_KEY = "email";
export const USER_NAME_KEY = "user_name";
export const USER_SOURCE_KEY = "source";
export const ACCESS_GRANTED_KEY = "carwash_access";
export const MOBILE_SOURCE = "mobile";
export const HEADER_VISIBLE = "header_true";

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_EMAIL_KEY);
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_NAME_KEY, name);
}

export function setUserEmail(email: string | null): void {
  if (typeof window === "undefined") return;
  if (email) {
    localStorage.setItem(USER_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(USER_EMAIL_KEY);
  }
}

export function getHeaderVisible(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HEADER_VISIBLE);
}

export function isHeaderNavigationEnabled(): boolean {
  return getHeaderVisible() === "true";
}

export function getUserSource(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_SOURCE_KEY);
}

/** Доступ уже подтверждён — не проверять заново после refresh */
export function isAccessGranted(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(ACCESS_GRANTED_KEY) === "true" &&
    getUserSource() === MOBILE_SOURCE
  );
}

export function grantAccess(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_GRANTED_KEY, "true");
}

export function revokeAccess(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_GRANTED_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_SOURCE_KEY);
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
}

export function formatUserDisplayName(user: {
  name?: string | null;
  last_name?: string | null;
}): string {
  return [user.name, user.last_name].filter(Boolean).join(" ").trim();
}

export function cacheUserProfile(user: {
  id?: number | null;
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const displayName = formatUserDisplayName(user);
  if (typeof window !== "undefined") {
    if (displayName) {
      setUserName(displayName);
    }
    if (user.id != null) {
      localStorage.setItem("user_id", String(user.id));
    }
    if ("email" in user) {
      setUserEmail(user.email ?? null);
    }
  }
  return displayName;
}

export function readUserSession() {
  return {
    email: getUserEmail(),
    name: getUserName(),
    source: getUserSource(),
  };
}
