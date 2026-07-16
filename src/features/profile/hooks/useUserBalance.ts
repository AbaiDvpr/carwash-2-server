"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo } from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/authToken";

export function formatBalance(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "0 ₸";
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(n)} ₸`;
}

/** Баланс из /api/auth/user_info */
export function useUserBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setBalance(null);
      setLoading(false);
      return;
    }

    try {
      const user = await fetchUserInfo();
      const n =
        typeof user.balance === "string"
          ? Number.parseFloat(user.balance)
          : Number(user.balance);
      setBalance(Number.isFinite(n) ? n : 0);
    } catch {
      // оставляем предыдущее значение
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sync();

    const onSync = () => {
      void sync();
    };

    window.addEventListener("focus", onSync);
    window.addEventListener("user-profile-updated", onSync);

    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("user-profile-updated", onSync);
    };
  }, [sync]);

  return { balance, loading, refresh: sync, formatted: formatBalance(balance ?? 0) };
}
