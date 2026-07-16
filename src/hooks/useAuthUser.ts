"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { forceLogout } from "@/lib/forceLogout";
import { formatUserDisplayName, getUserName } from "@/lib/userSession";

/**
 * Имя авторизованного пользователя.
 * Нет токена / 401 → forceLogout (в test_version — error-блок).
 */
export function useAuthUser() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      forceLogout({
        reason: "useAuthUser: нет access_token при синхронизации профиля",
        source: "useAuthUser.sync",
      });
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
      forceLogout({
        reason: "useAuthUser: не удалось загрузить user_info",
        source: "useAuthUser.sync",
        path: "/api/auth/user_info",
        status: apiErr?.status,
        body: apiErr?.body ?? (err instanceof Error ? err.message : String(err)),
      });
      setName("");
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

    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("focus", onSync);
    };
  }, [sync]);

  return { name, loading, mounted };
}
