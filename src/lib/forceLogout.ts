import {
  clearAccessToken,
  clearUserId,
  getAccessToken,
} from "@/lib/authToken";
import {
  collectAuthDebugSnapshot,
  isAuthDebugEnabled,
} from "@/lib/authDebug";
import { logout as nativeLogout } from "@/lib/navbarController";
import { revokeAccess } from "@/lib/userSession";
import {
  clearAuthError,
  setAuthError,
  type AuthErrorPayload,
} from "@/store/slices/appSlice";
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
   * @deprecated используйте skipDebug / confirmed.
   * Раньше: true = выйти сразу. В debug-режиме больше не обходит диалог.
   */
  immediate?: boolean;
  /**
   * Пользователь нажал «ОК» в debug-модалке — выполнить выход.
   */
  confirmed?: boolean;
  /**
   * Намеренный выход (кнопка «Выйти» в профиле и т.п.) — без debug-модалки.
   */
  skipDebug?: boolean;
  /** Сырой body ответа API */
  body?: unknown;
};

function isDebugHoldEnabled(): boolean {
  if (isAuthDebugEnabled()) return true;
  const store = getAppStore();
  if (!store) return false;
  return store.getState().app.test_version === true;
}

function formatDetail(detail?: string, body?: unknown): string | undefined {
  const parts: string[] = [];
  if (detail) parts.push(detail);
  if (body != null) {
    if (typeof body === "string") parts.push(body);
    else {
      try {
        parts.push(JSON.stringify(body, null, 2));
      } catch {
        parts.push(String(body));
      }
    }
  }
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}

function buildPayload(opts: ForceLogoutOptions): AuthErrorPayload {
  const reason = opts.reason ?? "forceLogout без указания причины";
  const apiDetail = formatDetail(opts.detail, opts.body);
  const snapshot = collectAuthDebugSnapshot();
  const detail = [apiDetail, "— сессия —", snapshot].filter(Boolean).join("\n");

  return {
    reason,
    source: opts.source,
    path: opts.path,
    status: opts.status,
    detail,
  };
}

/**
 * Полный logout: очистка storage + native logout.
 *
 * При AUTH_DEBUG=true сначала показывается модалка с причиной;
 * выход — после «ОК» (`confirmed: true`) или при `skipDebug` (намеренный выход).
 */
export function forceLogout(options?: ForceLogoutOptions | string): void {
  if (typeof window === "undefined") return;

  const opts: ForceLogoutOptions =
    typeof options === "string" ? { reason: options } : (options ?? {});

  const payload = buildPayload(opts);

  console.warn("[forceLogout]", {
    reason: payload.reason,
    source: payload.source,
    path: payload.path,
    status: payload.status,
    confirmed: opts.confirmed === true,
    skipDebug: opts.skipDebug === true,
    debugHold: isDebugHoldEnabled(),
  });

  const hold =
    isDebugHoldEnabled() && opts.confirmed !== true && opts.skipDebug !== true;

  if (hold) {
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
