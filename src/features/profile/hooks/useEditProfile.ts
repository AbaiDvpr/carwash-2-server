"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/authToken";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useEditProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setLoading(false);
      return;
    }

    try {
      const user = await fetchUserInfo();
      setFirstName(user.name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
    } catch {
      setError("Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  const save = useCallback(async () => {
    const name = firstName.trim();
    const last_name = lastName.trim();
    const emailValue = email.trim();

    if (!name) {
      setError("Укажите имя");
      setMessage(null);
      return false;
    }

    if (emailValue && !EMAIL_PATTERN.test(emailValue)) {
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
        last_name: last_name || null,
        email: emailValue || null,
      });
      setFirstName(user.name ?? name);
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      setMessage("Сохранено");
      return true;
    } catch {
      setError("Не удалось сохранить");
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
    save,
    canSave: firstName.trim().length > 0 && !saving && !loading,
  };
}
