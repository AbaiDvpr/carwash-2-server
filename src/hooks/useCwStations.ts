"use client";

import { useEffect, useState } from "react";
import { fetchCwStations } from "@/lib/api/cw";
import type { Station } from "@/data/stations";

type UseCwStationsState = {
  stations: Station[];
  loading: boolean;
  error: string | null;
};

export function useCwStations(): UseCwStationsState {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchCwStations()
      .then((data) => {
        if (!cancelled) {
          setStations(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить мойки");
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
