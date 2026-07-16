"use client";

import { useEffect, useState } from "react";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { fetchCwStations } from "@/lib/api/cw";
import { fetchEvStations } from "@/lib/api/ev";

type UseStationsState = {
  stations: Station[];
  loading: boolean;
  error: string | null;
};

/** Мойки + ЭЗС из API в одном списке */
export function useStations(): UseStationsState {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [washes, chargers] = await Promise.all([
          fetchCwStations(),
          fetchEvStations(),
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
  }, []);

  return { stations, loading, error };
}
