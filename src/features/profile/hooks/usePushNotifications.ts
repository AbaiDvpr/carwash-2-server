"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/authToken";

function toBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === "0" || value === "false") return false;
  if (value === 1 || value === "1" || value === "true") return true;
  return fallback;
}

export function usePushNotifications() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setLoading(false);
      return;
    }

    try {
      const user = await fetchUserInfo();
      setPushEnabled(toBool(user.push_enabled, true));
    } catch {
      // оставляем текущее значение, не мигаем true
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  const togglePush = useCallback(async () => {
    if (saving || loading) return;

    const next = !pushEnabled;
    setPushEnabled(next);
    setSaving(true);

    try {
      const user = await updateUserSettings({ push_enabled: next });
      setPushEnabled(toBool(user.push_enabled, next));
    } catch {
      setPushEnabled(!next);
    } finally {
      setSaving(false);
    }
  }, [pushEnabled, saving, loading]);

  return {
    pushEnabled,
    loading,
    saving,
    togglePush,
    hint: loading ? "…" : pushEnabled ? "Включены" : "Выключены",
  };
}
