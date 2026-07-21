"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { formatUserDisplayName, getUserName } from "@/lib/userSession";

/**
 * Профиль: имя, телефон, фото.
 * Нет токена — пустые поля (gate уже решает доступ).
 */
export function useAuthUser() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!hasAccessToken()) {
      setName("");
      setPhone("");
      setPhotoUrl(null);
      setLoading(false);
      return;
    }

    const cached = getUserName();
    if (cached) setName(cached);

    try {
      const user = await fetchUserInfo();
      setName(formatUserDisplayName(user) || cached || "");
      setPhone(user.phone ?? "");
      setPhotoUrl(user.photo_url ?? null);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        setName("");
        setPhone("");
        setPhotoUrl(null);
      }
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

  return { name, phone, photoUrl, loading, mounted };
}

/** +7 777 123 45 67 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    const d = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
    return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return phone || "—";
}
