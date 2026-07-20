"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUserInfo, type AuthUser } from "@/lib/api/auth";
import { fetchGeos, formatCityName, type GeoCity } from "@/lib/api/geos";
import { ApiError } from "@/lib/api";

type UseUserCityState = {
  geoId: number | null;
  cityName: string | null;
  cities: GeoCity[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useUserCity(): UseUserCityState {
  const [geoId, setGeoId] = useState<number | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      try {
        const [user, geos] = await Promise.all([fetchUserInfo(), fetchGeos()]);
        if (cancelled) return;
        applyUserCity(user, geos);
        setCities(geos);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setError(err instanceof Error ? err.message : "Не удалось загрузить города");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function applyUserCity(user: AuthUser, geos: GeoCity[]) {
      const id = user.geo_id ?? null;
      setGeoId(id);
      const match = id != null ? geos.find((geo) => geo.id === id) : null;
      setCityName(match ? formatCityName(match.city) : null);
    }

    void boot();

    const onSync = () => refresh();
    window.addEventListener("user-profile-updated", onSync);

    return () => {
      cancelled = true;
      window.removeEventListener("user-profile-updated", onSync);
    };
  }, [refresh, tick]);

  return { geoId, cityName, cities, loading, error, refresh };
}
