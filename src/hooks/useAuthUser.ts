"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo } from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/authToken";
import { forceLogout } from "@/lib/forceLogout";
import { formatUserDisplayName, getUserName } from "@/lib/userSession";

/**
 * Имя авторизованного пользователя.
 * Нет токена / 401 → сразу forceLogout, без режима «Гость».
 */
export function useAuthUser() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      forceLogout();
      setName("");
      setLoading(false);
      return;
    }

    const cached = getUserName();
    if (cached) setName(cached);

    try {
      const user = await fetchUserInfo();
      setName(formatUserDisplayName(user) || cached || "");
    } catch {
      forceLogout();
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
