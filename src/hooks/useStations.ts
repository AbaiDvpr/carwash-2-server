"use client";

import { useCallback, useEffect, useState } from "react";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { fetchCwStations } from "@/lib/api/cw";
import { fetchEvStations } from "@/lib/api/ev";

type UseStationsState = {
  stations: Station[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Мойки + ЭЗС по всем городам (all=1). Фильтр города — на UI списка. */
export function useStations(): UseStationsState {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      try {
        const [washes, chargers] = await Promise.all([
          fetchCwStations({ all: true }),
          fetchEvStations({ all: true }),
        ]);
        if (cancelled) return;
        setStations([...washes, ...chargers]);
        setError(null);
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setError(err instanceof Error ? err.message : "Не удалось загрузить точки");
        setStations([]);
        setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const onProfileUpdated = () => reload();
    window.addEventListener("user-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("user-profile-updated", onProfileUpdated);
  }, [reload]);

  return { stations, loading, error, reload };
}
