"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Station, StationKind } from "@/data/stations";
import { useUserCity } from "@/hooks/useUserCity";
import { useUserLocation } from "@/hooks/useUserLocation";
import { formatCityName, findNearestCity } from "@/lib/api/geos";
import {
  readListCityFilter,
  resolveListCityFilter,
  writeListCityFilter,
  type ListCityFilter,
} from "@/lib/listCityFilter";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import CitySelectPanel from "./CitySelectPanel";
import HomeTabShell from "./HomeTabShell";

type PlaceFilter = "all" | StationKind;

type MainProps = {
  stations: Station[];
  loading: boolean;
  error: string | null;
  onOpenMap: () => void;
  onShowOnMap: (stationId: string) => void;
};

const FILTERS: { id: PlaceFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "wash", label: "Мойки" },
  { id: "charging", label: "ЭЗС" },
];

function StationPhoto({ station }: { station: Station }) {
  if (station.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={station.photoUrl}
        alt={station.name}
        className="h-28 w-full object-cover"
      />
    );
  }

  const isCharging = station.kind === "charging";

  return (
    <div
      className={[
        "relative flex h-28 w-full items-end overflow-hidden",
        isCharging
          ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-zinc-800"
          : "bg-gradient-to-br from-sky-600 via-blue-600 to-zinc-800",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 0%, white 0, transparent 35%)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] flex w-full items-center gap-2 px-3 pb-2.5 pt-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
          {isCharging ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
              />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
            {isCharging ? "Электростанция" : "Автомойка"}
          </p>
          <p className="truncate text-xs font-medium text-white">Фото появится позже</p>
        </div>
      </div>
    </div>
  );
}

function StationCard({
  station,
  onShowOnMap,
}: {
  station: Station;
  onShowOnMap: (stationId: string) => void;
}) {
  const isOpen = station.status === "Открыто";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <StationPhoto station={station} />

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              isOpen
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {station.status}
          </span>
          <span className="text-[10px] text-zinc-400">{station.hoursLabel}</span>
        </div>

        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{station.name}</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{station.address}</p>

        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
          Свободно:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {station.freeSlots}/{station.washersTotal}
          </span>
        </p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <button
            type="button"
            onClick={() => onShowOnMap(station.id)}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            На карте
          </button>
          <button
            type="button"
            onClick={() =>
              open2GisMap(station.latitude, station.longitude, station.map_2gis)
            }
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            2ГИС
          </button>
          <button
            type="button"
            onClick={() =>
              openYandexMap(station.latitude, station.longitude, station.map_yandex)
            }
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Яндекс
          </button>
          <Link
            href={`/station/${station.id}`}
            className="ml-auto rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
          >
            Открыть
          </Link>
        </div>
      </div>
    </article>
  );
}

function ChargingEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/50 px-4 py-8 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Пока нет ЭЗС</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        В этом городе станции зарядки ещё не добавлены.
      </p>
    </div>
  );
}

export default function Main({
  stations,
  loading,
  error,
  onOpenMap,
  onShowOnMap,
}: MainProps) {
  const [kindFilter, setKindFilter] = useState<PlaceFilter>("all");
  const [cityFilter, setCityFilter] = useState<ListCityFilter>("all");
  const [cityFilterReady, setCityFilterReady] = useState(false);
  const manualCityFilter = useRef(false);
  const { geoId, cityName, cities, loading: cityLoading } = useUserCity();
  const { location: userLocation, loading: locationLoading } = useUserLocation();
  const needsCity = !cityLoading && geoId == null;
  const waitingGeo = locationLoading;

  // Восстановить фильтр из localStorage (all | geo_id), иначе город профиля
  useEffect(() => {
    if (cityLoading || cityFilterReady) return;
    const next = resolveListCityFilter(
      readListCityFilter(),
      geoId,
      cities.map((city) => city.id),
    );
    setCityFilter(next);
    writeListCityFilter(next);
    setCityFilterReady(true);
  }, [cityLoading, geoId, cities, cityFilterReady]);

  // Город по кэшу гео (обновляется polling’ом раз в 5 мин, без лишних запросов)
  useEffect(() => {
    if (!cityFilterReady || cities.length === 0 || !userLocation) return;
    if (manualCityFilter.current) return;

    const nearest = findNearestCity(
      userLocation.latitude,
      userLocation.longitude,
      cities,
    );
    if (!nearest) return;

    setCityFilter((prev) => {
      if (prev === nearest.id) return prev;
      writeListCityFilter(nearest.id);
      return nearest.id;
    });
  }, [cityFilterReady, cities, userLocation]);

  const selectCityFilter = (next: ListCityFilter) => {
    manualCityFilter.current = true;
    setCityFilter(next);
    writeListCityFilter(next);
  };

  const cityFiltered = useMemo(() => {
    if (cityFilter === "all") return stations;
    return stations.filter((station) => station.geoId === cityFilter);
  }, [cityFilter, stations]);

  const filtered = useMemo(() => {
    if (kindFilter === "all") return cityFiltered;
    return cityFiltered.filter((station) => station.kind === kindFilter);
  }, [kindFilter, cityFiltered]);

  const washCount = cityFiltered.filter((s) => s.kind === "wash").length;
  const chargingCount = cityFiltered.filter((s) => s.kind === "charging").length;

  const activeCityLabel =
    cityFilter === "all"
      ? "Все города"
      : formatCityName(cities.find((c) => c.id === cityFilter)?.city ?? cityName ?? "Город");

  const subtitle = loading || cityLoading || !cityFilterReady || waitingGeo
    ? waitingGeo
      ? "Определяем геолокацию…"
      : "Загрузка…"
    : error
      ? "Не удалось загрузить список"
      : kindFilter === "charging"
        ? chargingCount > 0
          ? `${chargingCount} электростанций · ${activeCityLabel}`
          : `Пока нет станций · ${activeCityLabel}`
        : kindFilter === "wash"
          ? `${washCount} автомоек · ${activeCityLabel}`
          : `${cityFiltered.length} точек · ${activeCityLabel}`;

  return (
    <HomeTabShell
      eyebrow="Рядом"
      title="Выберите точку"
      subtitle={subtitle}
      action={
        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7v13M15 4v13" />
          </svg>
          На карте
        </button>
      }
    >
      {needsCity ? (
        <div className="mb-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Укажите ваш город
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Нужен для центра карты и фильтра по умолчанию. Список можно смотреть по всем городам.
          </p>
          <CitySelectPanel
            cities={cities}
            selectedGeoId={geoId}
            loading={cityLoading}
            className="mt-3"
          />
        </div>
      ) : null}

      {loading || cityLoading || !cityFilterReady || waitingGeo ? (
        <div className="space-y-3">
          {waitingGeo ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <span
                className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-500"
                aria-hidden
              />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Определяем геолокацию
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Подбираем город по вашей точке…
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((key) => (
                <div
                  key={key}
                  className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
                />
              ))}
            </div>
          )}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Город">
            <button
              type="button"
              role="tab"
              aria-selected={cityFilter === "all"}
              onClick={() => selectCityFilter("all")}
              className={[
                "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                cityFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              Все
            </button>
            {cities.map((city) => {
              const active = cityFilter === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectCityFilter(city.id)}
                  className={[
                    "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  {formatCityName(city.city)}
                </button>
              );
            })}
          </div>

          <div
            className="mb-4 flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60"
            role="tablist"
            aria-label="Тип точек"
          >
            {FILTERS.map((item) => {
              const active = kindFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setKindFilter(item.id)}
                  className={[
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {kindFilter === "charging" && filtered.length === 0 ? (
            <ChargingEmptyState />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {cityFilter === "all"
                ? "По этому фильтру пока ничего нет"
                : `В городе ${activeCityLabel} по этому фильтру пока ничего нет`}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onShowOnMap={onShowOnMap}
                />
              ))}
            </div>
          )}
        </>
      )}
    </HomeTabShell>
  );
}
