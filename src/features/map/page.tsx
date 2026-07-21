"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import type { Station, StationKind } from "@/data/stations";
import { useStations } from "@/hooks/useStations";
import { useUserLocation } from "@/hooks/useUserLocation";
import { distanceKm } from "@/lib/api/geos";
import HomeMap from "@/features/home/components/HomeMap";
import "@/features/home/components/map.css";

/** Ближайшие в списке: 0–10 км */
const NEARBY_MAX_KM = 10;
/** В списке только до 100 км; дальше — только на карте */
const LIST_MAX_KM = 100;

type KindSelection = {
  wash: boolean;
  charging: boolean;
};

type StationWithDistance = Station & { distanceKm: number | null };

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

function parseKind(raw: string | null): StationKind | "all" {
  if (raw === "wash" || raw === "charging") return raw;
  return "all";
}

function kindsFromQuery(kind: StationKind | "all"): KindSelection {
  if (kind === "wash") return { wash: true, charging: false };
  if (kind === "charging") return { wash: false, charging: true };
  return { wash: true, charging: true };
}

function isAllKinds(kinds: KindSelection): boolean {
  return kinds.wash && kinds.charging;
}

function toggleKind(prev: KindSelection, key: keyof KindSelection): KindSelection {
  const next = { ...prev, [key]: !prev[key] };
  if (!next.wash && !next.charging) return prev;
  return next;
}

function matchesKinds(station: Station, kinds: KindSelection): boolean {
  if (isAllKinds(kinds)) return true;
  if (station.kind === "wash") return kinds.wash;
  return kinds.charging;
}

function matchesSearch(station: Station, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    station.name.toLowerCase().includes(q) ||
    station.address.toLowerCase().includes(q)
  );
}

function KindFilterButtons({
  kinds,
  onChange,
  className = "",
}: {
  kinds: KindSelection;
  onChange: (next: KindSelection) => void;
  className?: string;
}) {
  return (
    <div className={`map-kind-filters ${className}`.trim()} role="group" aria-label="Тип точек">
      <button
        type="button"
        className={`map-kind-filters__btn${kinds.wash ? " is-active" : ""}`}
        onClick={() => onChange(toggleKind(kinds, "wash"))}
      >
        Мойка
      </button>
      <button
        type="button"
        className={`map-kind-filters__btn${kinds.charging ? " is-active" : ""}`}
        onClick={() => onChange(toggleKind(kinds, "charging"))}
      >
        ЭЗС
      </button>
    </div>
  );
}

function StationListItem({
  station,
  onSelect,
}: {
  station: StationWithDistance;
  onSelect: (station: Station) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(station)}
        className="theme-block theme-hover flex w-full items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-left dark:border-zinc-800"
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{
            backgroundColor:
              station.kind === "charging" ? "#10b981" : "var(--app-button)",
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
  );
}

function StationSection({
  title,
  hint,
  stations,
  onSelect,
}: {
  title: string;
  hint?: string;
  stations: StationWithDistance[];
  onSelect: (station: Station) => void;
}) {
  if (stations.length === 0) return null;

  return (
    <section className="map-list-section">
      <div className="map-list-section__head">
        <h3 className="map-list-section__title">{title}</h3>
        {hint ? <p className="map-list-section__hint">{hint}</p> : null}
      </div>
      <ul className="space-y-2">
        {stations.map((station) => (
          <StationListItem key={station.id} station={station} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

function MapStationList({
  nearby,
  others,
  hasLocation,
  kinds,
  onKindsChange,
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  nearby: StationWithDistance[];
  others: StationWithDistance[];
  hasLocation: boolean;
  kinds: KindSelection;
  onKindsChange: (next: KindSelection) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (station: Station) => void;
  onClose: () => void;
}) {
  const [portalReady, setPortalReady] = useState(false);
  const empty = nearby.length === 0 && others.length === 0;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady) return null;

  return createPortal(
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
              Список
            </p>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--app-text)" }}
            >
              Точки на карте
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

        <label className="map-list-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск по названию или адресу"
            autoComplete="off"
          />
        </label>

        <KindFilterButtons kinds={kinds} onChange={onKindsChange} className="mb-3" />

        <div className="map-list-sheet__scroll">
          {empty ? (
            <p className="theme-description px-1 py-8 text-center text-xs">
              {!hasLocation
                ? "Включите геолокацию, чтобы увидеть точки в списке"
                : search.trim()
                  ? "Ничего не найдено в радиусе 100 км"
                  : "В радиусе 100 км пока нет точек"}
            </p>
          ) : (
            <>
              <StationSection
                title="Ближайшие точки"
                hint={
                  hasLocation
                    ? `0–${NEARBY_MAX_KM} км`
                    : "Включите геолокацию, чтобы видеть точки рядом"
                }
                stations={nearby}
                onSelect={onSelect}
              />
              <StationSection
                title="Остальные"
                hint={
                  hasLocation
                    ? `${NEARBY_MAX_KM}–${LIST_MAX_KM} км`
                    : undefined
                }
                stations={others}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function MapPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stations, loading, error } = useStations();
  const { location: userLocation } = useUserLocation();

  const kindFromQuery = parseKind(searchParams.get("kind"));
  const focusFromQuery = searchParams.get("station");

  const [focusStationId, setFocusStationId] = useState<string | null>(focusFromQuery);
  const [listOpen, setListOpen] = useState(false);
  const [kinds, setKinds] = useState<KindSelection>(() => kindsFromQuery(kindFromQuery));
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (focusFromQuery) setFocusStationId(focusFromQuery);
  }, [focusFromQuery]);

  useEffect(() => {
    setKinds(kindsFromQuery(kindFromQuery));
  }, [kindFromQuery]);

  const filteredStations = useMemo(
    () => stations.filter((station) => matchesKinds(station, kinds)),
    [stations, kinds],
  );

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

    return withDistance
      .filter((station) => matchesSearch(station, search))
      .sort((a, b) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
  }, [filteredStations, userLocation, search]);

  const { nearby, others } = useMemo(() => {
    const near: StationWithDistance[] = [];
    const rest: StationWithDistance[] = [];

    if (!userLocation) {
      return { nearby: near, others: rest };
    }

    for (const station of sortedList) {
      const km = station.distanceKm;
      if (km == null || km > LIST_MAX_KM) continue;
      if (km <= NEARBY_MAX_KM) near.push(station);
      else rest.push(station);
    }

    return { nearby: near, others: rest };
  }, [sortedList, userLocation]);

  return (
    <PageLayout title="Карта" description="Точки на карте" className="page--map" bare>
      <div className="map-screen">
        <HomeMap
          stations={filteredStations}
          loading={loading}
          error={error}
          focusStationId={focusStationId}
          onFocusConsumed={() => setFocusStationId(null)}
          onClose={() => router.push("/")}
          onOpenList={() => setListOpen(true)}
        />
        <KindFilterButtons
          kinds={kinds}
          onChange={setKinds}
          className="map-kind-filters--map"
        />
      </div>

      {listOpen ? (
        <MapStationList
          nearby={nearby}
          others={others}
          hasLocation={Boolean(userLocation)}
          kinds={kinds}
          onKindsChange={setKinds}
          search={search}
          onSearchChange={setSearch}
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
