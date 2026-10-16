import { ApiError, API_FAIL_MESSAGE } from "@/lib/api";

export const API_FAIL_TITLE = "Ошибка";
export const API_FAIL_HINT = "Обновите приложение";

export function apiFailMessage(
  t?: (key: string, fallback?: string) => string,
): string {
  if (!t) return API_FAIL_MESSAGE;
  const title = t("common.api_error", API_FAIL_TITLE);
  const hint = t("common.api_error_hint", API_FAIL_HINT);
  return `${title}. ${hint}`;
}

function isTechnicalMessage(message: string): boolean {
  return /^(API\s+\d+|Server Error|SQLSTATE|Illuminate\\|ErrorException|internal server|network|Unauthenticated)/i.test(
    message.trim(),
  );
}

function firstFieldError(
  errors: Record<string, string[]> | null | undefined,
): string | null {
  if (!errors) return null;
  return Object.values(errors).flat().find(Boolean) ?? null;
}

/** Клиенту: 422/бизнес-поля можно показать. 5xx, сеть, URL — общий текст. */
export function safeApiError(
  err: unknown,
  t?: (key: string, fallback?: string) => string,
): string {
  if (err instanceof ApiError) {
    if (err.status >= 500 || err.status === 0 || err.status === 408) {
      return apiFailMessage(t);
    }
    const body = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const field = firstFieldError(body?.errors);
    if (field && !isTechnicalMessage(field)) return field;
    if (
      err.status < 500 &&
      body?.message &&
      !isTechnicalMessage(body.message)
    ) {
      return body.message;
    }
  }
  return apiFailMessage(t);
}
