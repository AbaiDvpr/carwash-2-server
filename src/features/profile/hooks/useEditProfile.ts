"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { apiFailMessage } from "@/lib/apiFail";
import { hasAccessToken } from "@/lib/authToken";
import { emailTakenFromApiError } from "@/lib/emailCheck";
import { getUserEmail } from "@/lib/userSession";
import { useT } from "@/hooks/useT";
import { useUniqueEmail } from "./useUniqueEmail";

export function useEditProfile() {
  const t = useT();
  const {
    emailError,
    taken: emailTaken,
    checking: checkingEmail,
    check: checkEmail,
    clear: clearEmailError,
    markTaken,
  } = useUniqueEmail();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => getUserEmail() ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
    clearEmailError();
  }, [clearEmailError]);

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setLoading(false);
      return;
    }

    const cachedEmail = getUserEmail();
    if (cachedEmail) setEmail(cachedEmail);

    try {
      const user = await fetchUserInfo();
      setFirstName(user.name ?? "");
      setLastName(user.last_name ?? "");
      const nextEmail = user.email?.trim() || getUserEmail() || "";
      setEmail(nextEmail);
      setError(null);
      clearEmailError();
    } catch {
      setError(apiFailMessage());
    } finally {
      setLoading(false);
    }
  }, [clearEmailError]);

  useEffect(() => {
    void sync();

    const onSync = () => {
      void sync();
    };

    window.addEventListener("user-profile-updated", onSync);
    window.addEventListener("focus", onSync);
    return () => {
      window.removeEventListener("user-profile-updated", onSync);
      window.removeEventListener("focus", onSync);
    };
  }, [sync]);

  const save = useCallback(async () => {
    const name = firstName.trim();
    const last_name = lastName.trim() || null;
    const emailValue = email.trim();

    if (!name) {
      setError(t("profile.gate_name_required", "Укажите имя"));
      setMessage(null);
      return false;
    }

    const emailOk = await checkEmail(emailValue);
    if (!emailOk) {
      setError(null);
      setMessage(null);
      return false;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const user = await updateUserSettings({
        name,
        last_name,
        email: emailValue,
      });
      setFirstName(user.name ?? name);
      setLastName(user.last_name ?? last_name ?? "");
      setEmail(user.email?.trim() || emailValue);
      setMessage(t("common.saved", "Сохранено"));
      return true;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (emailTakenFromApiError(err)) {
        markTaken();
        setError(null);
      } else {
        const body = apiErr?.body as {
          message?: string;
          errors?: Record<string, string[]>;
        } | null;
        const emailErr = body?.errors?.email?.[0];
        if (emailErr) {
          clearEmailError();
          setError(emailErr);
        } else {
          setError(apiFailMessage());
        }
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [checkEmail, clearEmailError, email, firstName, lastName, markTaken, t]);

  return {
    firstName,
    lastName,
    email,
    setFirstName,
    setLastName,
    setEmail,
    loading,
    saving,
    message,
    error,
    emailError,
    emailTaken,
    checkingEmail,
    checkEmail,
    clearEmailError,
    clearFeedback,
    save,
    canSave:
      firstName.trim().length > 0 &&
      email.trim().length > 0 &&
      !emailTaken &&
      !checkingEmail &&
      !saving &&
      !loading,
  };
}
