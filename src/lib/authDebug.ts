/**
 * Auth debug: перед logout показывается модалка с причиной, выход — после «ОК».
 * Включи вручную: `true`. На прод для пользователей оставь `false`.
 */
export const AUTH_DEBUG = true;

export function isAuthDebugEnabled(): boolean {
  return AUTH_DEBUG === true;
}

/** Снимок сессии — что есть / чего нет в момент логаута. */
export function collectAuthDebugSnapshot(): string {
  if (typeof window === "undefined") return "";

  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
  const userId =
    typeof localStorage !== "undefined" ? localStorage.getItem("user_id") : null;
  const source =
    typeof localStorage !== "undefined" ? localStorage.getItem("source") : null;
  const access =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("carwash_access")
      : null;
  const profileComplete =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("profile_complete")
      : null;
  const email =
    typeof localStorage !== "undefined" ? localStorage.getItem("email") : null;
  const name =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("user_name")
      : null;

  const tokenInfo = token
    ? `есть · len=${token.length} · …${token.slice(-8)}`
    : "НЕТ ← часто из‑за этого кидает на авторизацию";

  const missing: string[] = [];
  if (!token) missing.push("access_token");
  if (!userId) missing.push("user_id");
  if (source !== "mobile") missing.push("source=mobile");
  if (access !== "true") missing.push("carwash_access");

  return [
    `href: ${window.location.href}`,
    `access_token: ${tokenInfo}`,
    `user_id: ${userId ?? "нет"}`,
    `source: ${source ?? "нет"}`,
    `carwash_access: ${access ?? "нет"}`,
    `profile_complete: ${profileComplete ?? "нет"}`,
    `email: ${email ?? "нет"}`,
    `user_name: ${name ?? "нет"}`,
    missing.length
      ? `не хватает: ${missing.join(", ")}`
      : "базовые ключи сессии на месте",
  ].join("\n");
}
