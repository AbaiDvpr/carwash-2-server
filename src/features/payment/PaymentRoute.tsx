"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStationByPaymentSlug, type Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { fetchCwStation } from "@/lib/api/cw";
import { fetchEvStation, parseEvStationId } from "@/lib/api/ev";
import PaymentPage from "./page";

type PaymentRouteProps = {
  slug: string;
};

/**
 * slug = число → мойка из API
 * slug = ev-{id} → ЭЗС из API
 * slug = Sauran… → статический пункт (гео)
 */
export default function PaymentRoute({ slug }: PaymentRouteProps) {
  const evId = parseEvStationId(slug);
  const isCwLocationId = /^\d+$/.test(slug);
  const isApiStation = isCwLocationId || evId != null;

  const [station, setStation] = useState<Station | null>(
    isApiStation ? null : (getStationByPaymentSlug(slug) ?? null),
  );
  const [loading, setLoading] = useState(isApiStation);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(
    !isApiStation && !getStationByPaymentSlug(slug),
  );

  useEffect(() => {
    if (!isApiStation) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    const load =
      evId != null ? fetchEvStation(evId) : fetchCwStation(slug);

    void load
      .then((data) => {
        if (cancelled) return;
        setStation(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStation(null);
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Не удалось загрузить точку");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isApiStation, slug, evId]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (notFound || !station) {
    return (
      <div className="page-content text-center">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Точка не найдена
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {error ?? "Такой точки для оплаты нет."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  return <PaymentPage station={station} />;
}
