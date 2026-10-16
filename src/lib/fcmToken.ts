/** Flutter / натив может писать FCM в localStorage под этим ключом. */
export const FCM_TOKEN_KEY = "fcm_token";

export function getFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(FCM_TOKEN_KEY);
  if (!raw) return null;
  const token = raw.trim();
  return token !== "" ? token : null;
}

export function setFcmToken(token: string): void {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (!trimmed) {
    localStorage.removeItem(FCM_TOKEN_KEY);
    return;
  }
  localStorage.setItem(FCM_TOKEN_KEY, trimmed);
}

export function clearFcmToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FCM_TOKEN_KEY);
}
