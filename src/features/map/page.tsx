"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import type { Station, StationKind } from "@/data/stations";
import { useStations } from "@/hooks/useStations";
import { useUserLocation } from "@/hooks/useUserLocation";
import { distanceKm } from "@/lib/api/geos";
import HomeMap from "@/features/home/components/HomeMap";

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

function parseKind(raw: string | null): StationKind | "all" {
  if (raw === "wash" || raw === "charging") return raw;
  return "all";
}

function MapStationList({
  stations,
  onSelect,
  onClose,
}: {
  stations: Array<Station & { distanceKm: number | null }>;
  onSelect: (station: Station) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label="Закрыть список"
      />
      <div className="map-list-sheet" role="dialog" aria-label="Список точек">
        <div className="map-drawer__handle" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <p className="theme-description text-[11px] font-medium uppercase tracking-wider">
              Рядом
            </p>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--app-text)" }}
            >
              Ближайшие точки
            </h2>
          </div>
          <button
            type="button"
            className="map-drawer__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="map-list-sheet__scroll">
          {stations.length === 0 ? (
            <p className="theme-description px-1 py-8 text-center text-xs">
              Пока нет точек по этому фильтру
            </p>
          ) : (
            <ul className="space-y-2">
              {stations.map((station) => (
                <li key={station.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(station)}
                    className="theme-block theme-hover flex w-full items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-left dark:border-zinc-800"
                  >
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{
                        backgroundColor:
                          station.kind === "charging"
                            ? "#10b981"
                            : "var(--app-button)",
                      }}
                    >
                      {station.kind === "charging" ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className="truncate text-sm font-semibold"
                          style={{ color: "var(--app-text)" }}
                        >
                          {station.name}
                        </span>
                        {station.distanceKm != null ? (
                          <span className="theme-description shrink-0 text-[11px] font-medium">
                            {formatDistanceLabel(station.distanceKm)}
                          </span>
                        ) : null}
                      </span>
                      <span className="theme-description mt-0.5 block truncate text-xs">
                        {station.address}
                      </span>
                      <span className="theme-description mt-1 block text-[11px]">
                        {station.kind === "charging" ? "ЭЗС" : "Мойка"} ·{" "}
                        {station.freeSlots}/{station.washersTotal} свободно
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function MapPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stations, loading, error } = useStations();
  const { location: userLocation } = useUserLocation();

  const kind = parseKind(searchParams.get("kind"));
  const focusFromQuery = searchParams.get("station");

  const [focusStationId, setFocusStationId] = useState<string | null>(focusFromQuery);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (focusFromQuery) setFocusStationId(focusFromQuery);
  }, [focusFromQuery]);

  const filteredStations = useMemo(() => {
    if (kind === "all") return stations;
    return stations.filter((station) => station.kind === kind);
  }, [stations, kind]);

  const sortedList = useMemo(() => {
    const withDistance = filteredStations.map((station) => {
      const km = userLocation
        ? distanceKm(
            userLocation.latitude,
            userLocation.longitude,
            station.latitude,
            station.longitude,
          )
        : null;
      return { ...station, distanceKm: km };
    });

    return withDistance.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [filteredStations, userLocation]);

  return (
    <PageLayout title="Карта" description="Точки на карте" className="page--map" bare>
      <div className="page-content flex h-full min-h-0 flex-col overflow-hidden !pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <HomeMap
          stations={filteredStations}
          loading={loading}
          error={error}
          focusStationId={focusStationId}
          onFocusConsumed={() => setFocusStationId(null)}
          onClose={() => router.push("/")}
          onOpenList={() => setListOpen(true)}
        />
      </div>

      {listOpen ? (
        <MapStationList
          stations={sortedList}
          onClose={() => setListOpen(false)}
          onSelect={(station) => {
            setListOpen(false);
            setFocusStationId(station.id);
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <PageLayout title="Карта" className="page--map" bare>
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Загрузка карты…
          </div>
        </PageLayout>
      }
    >
      <MapPageInner />
    </Suspense>
  );
}
