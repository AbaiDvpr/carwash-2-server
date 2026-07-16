import {
  clearAccessToken,
  clearUserId,
  getAccessToken,
} from "@/lib/authToken";
import { logout as nativeLogout } from "@/lib/navbarController";
import { revokeAccess } from "@/lib/userSession";
import { clearAuthError, setAuthError, type AuthErrorPayload } from "@/store/slices/appSlice";
import { getAppStore } from "@/store/storeRef";

let logoutInProgress = false;

function logoutApiUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return `${base}/api/auth/logout`;
}

/**
 * Попытка revoke на сервере. Не через apiFetch — иначе 401 на /logout
 * снова вызовет forceLogout. Токен уже может быть мёртвым: 401/сеть — ок, игнор.
 * Локальный выход от ответа сервера не зависит.
 */
function revokeServerToken(token: string): void {
  void fetch(logoutApiUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then(() => {
      // 200 или 401 — не важно
    })
    .catch(() => {
      // сеть / CORS — не важно
    });
}

export type ForceLogoutOptions = Partial<AuthErrorPayload> & {
  /**
   * true — выйти сразу (кнопка «Выйти» в error-блоке).
   * false/undefined — в test_version показать ошибку без логаута.
   */
  immediate?: boolean;
  /** Сырой body ответа API */
  body?: unknown;
};

function isTestVersion(): boolean {
  const store = getAppStore();
  if (!store) return true;
  return store.getState().app.test_version === true;
}

function formatDetail(detail?: string, body?: unknown): string | undefined {
  if (detail) return detail;
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

/**
 * Полный logout: сразу очистка storage + native logout.
 * Ответ /api/auth/logout (в т.ч. 401 при исчерпанном токене) ни на что не влияет.
 * В test_version без immediate — только error-блок.
 */
export function forceLogout(options?: ForceLogoutOptions | string): void {
  if (typeof window === "undefined") return;

  const opts: ForceLogoutOptions =
    typeof options === "string" ? { reason: options } : (options ?? {});

  const reason = opts.reason ?? "forceLogout без указания причины";
  const payload: AuthErrorPayload = {
    reason,
    source: opts.source,
    path: opts.path,
    status: opts.status,
    detail: formatDetail(opts.detail, opts.body),
  };

  if (!opts.immediate && isTestVersion()) {
    const store = getAppStore();
    if (store) {
      store.dispatch(setAuthError(payload));
      return;
    }
  }

  if (logoutInProgress) return;
  logoutInProgress = true;

  const store = getAppStore();
  store?.dispatch(clearAuthError());

  // Сначала локальный выход — сервер может ответить 401 на мёртвый токен
  const token = getAccessToken();
  clearAccessToken();
  clearUserId();
  revokeAccess();
  nativeLogout();

  if (token) {
    revokeServerToken(token);
  }

  window.setTimeout(() => {
    logoutInProgress = false;
  }, 300);
}

export function requireAccessToken(): string {
  const token = getAccessToken();
  if (!token) {
    forceLogout({
      reason: "Нет access_token в localStorage",
      source: "requireAccessToken",
    });
    throw new Error("Unauthenticated");
  }
  return token;
}
