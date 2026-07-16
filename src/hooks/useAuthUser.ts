"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { formatUserDisplayName, getUserName } from "@/lib/userSession";

/**
 * Имя авторизованного пользователя.
 * Нет токена — просто пустое имя (gate уже решает доступ).
 * 401/403 обрабатывает apiFetch → forceLogout.
 * Сетевые/прочие ошибки не логаутят — оставляем кэш.
 */
export function useAuthUser() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setName("");
      setLoading(false);
      return;
    }

    const cached = getUserName();
    if (cached) setName(cached);

    try {
      const user = await fetchUserInfo();
      setName(formatUserDisplayName(user) || cached || "");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      // 401/403 → logout в apiFetch; остальное — не выкидываем сессию
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        setName("");
      }
      // иначе оставляем cached name
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void sync();

    const onSync = () => {
      void sync();
    };

    window.addEventListener("storage", onSync);
    window.addEventListener("focus", onSync);
    window.addEventListener("user-profile-updated", onSync);

    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("focus", onSync);
      window.removeEventListener("user-profile-updated", onSync);
    };
  }, [sync]);

  return { name, loading, mounted };
}
