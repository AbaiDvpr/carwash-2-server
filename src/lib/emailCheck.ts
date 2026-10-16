import { ApiError } from "@/lib/api";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailTakenMessage(message: string | undefined | null): boolean {
  return /taken|unique|уже|существует|занят/i.test(message ?? "");
}

export function emailTakenFromApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const body = err.body as {
    message?: string;
    errors?: Record<string, string[]>;
  } | null;
  return isEmailTakenMessage(body?.errors?.email?.[0] ?? body?.message);
}
