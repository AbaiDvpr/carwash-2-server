"use client";

import { useState } from "react";
import { updateUserSettings } from "@/lib/api/auth";
import { formatCityName, type GeoCity } from "@/lib/api/geos";

type CitySelectPanelProps = {
  cities: GeoCity[];
  selectedGeoId?: number | null;
  loading?: boolean;
  className?: string;
};

export default function CitySelectPanel({
  cities,
  selectedGeoId = null,
  loading = false,
  className = "",
}: CitySelectPanelProps) {
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        className={`h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      />
    );
  }

  if (cities.length === 0) {
    return (
      <p className={`text-center text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        Список городов пока пуст
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-left dark:border-zinc-800 dark:bg-zinc-950">
        {cities.map((city, index) => {
          const selected = selectedGeoId === city.id;
          const busy = savingId === city.id;
          return (
            <div key={city.id}>
              {index > 0 ? (
                <div className="border-t border-zinc-100 dark:border-zinc-800" />
              ) : null}
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={savingId != null}
                onClick={() => {
                  void (async () => {
                    if (selected) return;
                    setSavingId(city.id);
                    setError(null);
                    try {
                      await updateUserSettings({ geo_id: city.id });
                    } catch {
                      setError("Не удалось сохранить город");
                    } finally {
                      setSavingId(null);
                    }
                  })();
                }}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900/60"
              >
                <span
                  className={[
                    "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                    selected
                      ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
                      : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900",
                    busy ? "opacity-60" : "",
                  ].join(" ")}
                  aria-hidden
                >
                  {busy ? (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/80" />
                  ) : selected ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {formatCityName(city.city)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-zinc-400">
                    {city.country}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
