"use client";

import { useCallback, useRef, useState } from "react";
import { checkEmailAvailable } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { EMAIL_PATTERN, isEmailTakenMessage } from "@/lib/emailCheck";
import { useT } from "@/hooks/useT";

const TAKEN_FALLBACK = "Такая почта уже существует";

export function useUniqueEmail() {
  const t = useT();
  const checkIdRef = useRef(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);

  const takenMessage = useCallback(
    () => t("profile.gate_email_taken", TAKEN_FALLBACK),
    [t],
  );

  const formatError = useCallback(
    (email: string): string | null => {
      const value = email.trim();
      if (!value) return t("profile.gate_email_required", "Укажите email");
      if (!EMAIL_PATTERN.test(value)) {
        return t("profile.gate_email_invalid", "Укажите корректный email");
      }
      return null;
    },
    [t],
  );

  const clear = useCallback(() => {
    checkIdRef.current += 1;
    setEmailError(null);
    setTaken(false);
  }, []);

  const markTaken = useCallback(() => {
    setTaken(true);
    setEmailError(takenMessage());
  }, [takenMessage]);

  const check = useCallback(
    async (email: string, options?: { required?: boolean }): Promise<boolean> => {
      const value = email.trim();
      const required = options?.required !== false;

      if (!value) {
        if (required) {
          setTaken(false);
          setEmailError(t("profile.gate_email_required", "Укажите email"));
          return false;
        }
        setTaken(false);
        setEmailError(null);
        return true;
      }

      const invalid = formatError(value);
      if (invalid) {
        setTaken(false);
        setEmailError(invalid);
        return false;
      }

      const id = ++checkIdRef.current;
      setChecking(true);

      try {
        const result = await checkEmailAvailable(value);
        if (id !== checkIdRef.current) return false;
        if (!result.available) {
          markTaken();
          return false;
        }
        setTaken(false);
        setEmailError(null);
        return true;
      } catch (err) {
        if (id !== checkIdRef.current) return false;
        const apiErr = err instanceof ApiError ? err : null;
        const body = apiErr?.body as {
          message?: string;
          errors?: Record<string, string[]>;
        } | null;
        const field = body?.errors?.email?.[0];
        if (field && isEmailTakenMessage(field)) {
          markTaken();
          return false;
        }
        if (apiErr?.status === 422 && field) {
          setTaken(false);
          setEmailError(field);
          return false;
        }
        // Сеть / 5xx — не блокируем ввод, сохранение ещё раз проверит на сервере.
        setTaken(false);
        return true;
      } finally {
        if (id === checkIdRef.current) setChecking(false);
      }
    },
    [formatError, markTaken, t],
  );

  return {
    emailError,
    checking,
    taken,
    check,
    clear,
    markTaken,
    formatError,
  };
}
