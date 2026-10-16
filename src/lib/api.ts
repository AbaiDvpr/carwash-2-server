/**
 * Базовый URL API из .env.local (NEXT_PUBLIC_API_URL).
 * Все запросы (кроме login/register) идут с Bearer access_token.
 * 401/403 при requireAuth → сразу forceLogout. Без токена — только ApiError.
 */
import { getAccessToken } from "@/lib/authToken";
import { forceLogout } from "@/lib/forceLogout";

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env.local",
    );
  }

  return base.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

/** Текст для клиента. URL и код в message не попадают. */
export const API_FAIL_MESSAGE = "Ошибка. Обновите приложение";

export class ApiError extends Error {
  status: number;
  path: string;
  body: unknown;

  constructor(status: number, path: string, body: unknown) {
    super(API_FAIL_MESSAGE);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/translations",
  "/api/auth/otp/send",
  "/api/auth/otp/verify",
];

function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}?`),
  );
}

export type ApiFetchInit = RequestInit & {
  /** false — login/register и т.п. По умолчанию true. */
  requireAuth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const { requireAuth = !isPublicApiPath(path), ...fetchInit } = init ?? {};
  const token = getAccessToken();

  if (requireAuth && !token) {
    // Не forceLogout здесь: на старте WebView токен может ещё не прийти.
    // Сессию закрывает MobileAccessGate / ответ 401 с реальным Bearer.
    throw new ApiError(401, path, { message: "Unauthenticated." });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(fetchInit.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      cache: "no-store",
      ...fetchInit,
      headers,
    });
  } catch {
    throw new ApiError(0, path, { message: "network" });
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    // истёк / неверный / отсутствует на сервере → logout
    // (при AUTH_DEBUG сначала модалка с причиной, выход после «ОК»)
    if (requireAuth && (response.status === 401 || response.status === 403)) {
      forceLogout({
        reason:
          response.status === 401
            ? "API вернул 401 Unauthorized — токен не принят сервером"
            : "API вернул 403 Forbidden — нет доступа",
        source: "apiFetch",
        path,
        status: response.status,
        body,
      });
    }

    throw new ApiError(response.status, path, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
