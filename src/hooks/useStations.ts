"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { fetchCwStations } from "@/lib/api/cw";
import { fetchEvStations } from "@/lib/api/ev";

type UseStationsState = {
  stations: Station[];
  loading: boolean;
  /** Повторная загрузка при уже имеющихся данных (список / фильтр) */
  refreshing: boolean;
  error: string | null;
  reload: () => void;
};

/** Мойки + ЭЗС по всем городам (all=1). Фильтр города — на UI списка. */
export function useStations(): UseStationsState {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hasDataRef = useRef(false);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const soft = hasDataRef.current;
      if (soft) setRefreshing(true);
      else setLoading(true);

      try {
        const [washes, chargers] = await Promise.all([
          fetchCwStations({ all: true }),
          fetchEvStations({ all: true }),
        ]);
        if (cancelled) return;
        hasDataRef.current = true;
        setStations([...washes, ...chargers]);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setError(err instanceof Error ? err.message : "Не удалось загрузить точки");
        if (!hasDataRef.current) setStations([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
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

  return { stations, loading, refreshing, error, reload };
}
