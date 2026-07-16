"use client";

import { useEffect, useState } from "react";
import type { Station } from "@/data/stations";
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

    Promise.all([fetchCwStations(), fetchEvStations()])
      .then(([washes, chargers]) => {
        if (!cancelled) {
          setStations([...washes, ...chargers]);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить точки");
          setStations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stations, loading, error };
}
