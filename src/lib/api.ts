/**
 * Базовый URL API из .env.local (NEXT_PUBLIC_API_URL).
 * Все запросы (кроме login/register) идут с Bearer access_token.
 * Нет токена / 401 → forceLogout (в test_version — error-блок).
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

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, path: string, body: unknown) {
    super(`API ${status}: ${path}`);
    this.status = status;
    this.body = body;
  }
}

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/register"];

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

  if (requireAuth) {
    if (!token) {
      forceLogout({
        reason: "Запрос с requireAuth, но access_token отсутствует",
        source: "apiFetch",
        path,
        status: 401,
        body: { message: "Unauthenticated." },
      });
      throw new ApiError(401, path, { message: "Unauthenticated." });
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(fetchInit.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), {
    ...fetchInit,
    headers,
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    // истёк / неверный / отсутствует на сервере
    if (requireAuth && (response.status === 401 || response.status === 403)) {
      forceLogout({
        reason:
          response.status === 401
            ? "API вернул 401 Unauthorized"
            : "API вернул 403 Forbidden",
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
