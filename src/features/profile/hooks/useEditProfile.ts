"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { getUserEmail } from "@/lib/userSession";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useEditProfile() {
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
  }, []);

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
    } catch {
      setError("Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError("Укажите имя");
      setMessage(null);
      return false;
    }

    if (!emailValue) {
      setError("Укажите email");
      setMessage(null);
      return false;
    }

    if (!EMAIL_PATTERN.test(emailValue)) {
      setError("Укажите корректный email");
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
      setMessage("Сохранено");
      return true;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const body = apiErr?.body as {
        message?: string;
        errors?: Record<string, string[]>;
      } | null;
      const emailErr = body?.errors?.email?.[0];
      if (emailErr) {
        setError(
          /taken|unique|уже/i.test(emailErr)
            ? "Этот email уже занят"
            : emailErr,
        );
      } else {
        setError(body?.message || "Не удалось сохранить");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [email, firstName, lastName]);

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
    clearFeedback,
    save,
    canSave:
      firstName.trim().length > 0 &&
      email.trim().length > 0 &&
      !saving &&
      !loading,
  };
}
