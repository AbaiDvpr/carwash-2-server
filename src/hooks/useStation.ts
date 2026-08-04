"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchCwStation } from "@/lib/api/cw";
import { fetchEvStation, parseEvStationId } from "@/lib/api/ev";
import type { Station } from "@/data/stations";

type UseStationState = {
  station: Station | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => void;
};

/** Деталь мойки (id=1) или ЭЗС (id=ev-1) */
export function useStation(id: string): UseStationState {
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const loadedIdRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const idChanged = loadedIdRef.current !== id;

    setLoading(true);
    setError(null);
    setNotFound(false);
    if (idChanged) {
      setStation(null);
      loadedIdRef.current = id;
    }

    const evId = parseEvStationId(id);
    const load = evId != null ? fetchEvStation(evId) : fetchCwStation(id);

    load
      .then((data) => {
        if (!cancelled) {
          setStation(data);
          setError(null);
          setNotFound(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        if (idChanged) setStation(null);

        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          setError(null);
          return;
        }

        setNotFound(false);
        setError(err instanceof Error ? err.message : "Не удалось загрузить точку");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  return { station, loading, error, notFound, reload };
}
