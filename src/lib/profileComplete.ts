import type { AuthUser } from "@/lib/api/auth";

export const PROFILE_COMPLETE_KEY = "profile_complete";

/** Профиль неполный, если нет имени, фамилии или email. */
export function isProfileIncomplete(
  user: Pick<AuthUser, "name" | "last_name" | "email"> | null | undefined,
): boolean {
  if (!user) return true;
  return !user.name?.trim() || !user.last_name?.trim() || !user.email?.trim();
}

/** `true` / `false` если уже проверяли, `null` — ещё не знаем. */
export function getProfileCompleteCached(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(PROFILE_COMPLETE_KEY);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function setProfileCompleteCached(complete: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_COMPLETE_KEY, complete ? "true" : "false");
}

export function clearProfileCompleteCached(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_COMPLETE_KEY);
}

export function syncProfileCompleteCache(user: {
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): boolean {
  const complete = !isProfileIncomplete({
    name: user.name ?? "",
    last_name: user.last_name ?? null,
    email: user.email ?? null,
  });
  setProfileCompleteCached(complete);
  return complete;
}
