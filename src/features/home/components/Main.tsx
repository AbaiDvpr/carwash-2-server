"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Station, StationKind } from "@/data/stations";
import { useCwStations } from "@/hooks/useCwStations";
import { open2GisMap, openYandexMap } from "@/lib/mapController";

type PlaceFilter = "all" | StationKind;

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

function StationCard({ station }: { station: Station }) {
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
          <span className="text-[11px] text-zinc-400">
            {station.kind === "charging"
              ? "Зарядка"
              : isOpen
                ? `${station.freeSlots}/${station.washersTotal || station.washers.length} своб.`
                : "Нет мест"}
          </span>
        </div>

        <h2 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {station.name}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{station.address}</p>
        <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {isOpen ? `Открыто · ${station.hoursLabel}` : `Закрыто · ${station.hoursLabel}`}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <a
            href={station.map_yandex}
            onClick={(event) => {
              event.preventDefault();
              openYandexMap(station.latitude, station.longitude, station.map_yandex);
            }}
            className="flex items-center justify-center rounded-lg bg-zinc-900 px-2 py-1.5 text-center text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Яндекс
          </a>
          <a
            href={station.map_2gis}
            onClick={(event) => {
              event.preventDefault();
              open2GisMap(station.latitude, station.longitude, station.map_2gis);
            }}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-2 py-1.5 text-center text-[11px] font-medium text-white hover:bg-blue-700"
          >
            2ГИС
          </a>
        </div>

        <Link
          href={`/station/${station.id}`}
          className="mt-1.5 flex w-full items-center justify-center rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Подробнее
        </Link>
      </div>
    </article>
  );
}

function ChargingEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
        </svg>
      </div>
      <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Электростанции скоро появятся
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Раздел зарядных станций пока пуст. Мы готовим список точек — зайдите позже или
        посмотрите автомойки во вкладке «Мойки».
      </p>
    </div>
  );
}

export default function Main() {
  const { stations, loading, error } = useCwStations();
  const [filter, setFilter] = useState<PlaceFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return stations;
    return stations.filter((station) => station.kind === filter);
  }, [filter, stations]);

  const washCount = stations.filter((s) => s.kind === "wash").length;
  const chargingCount = stations.filter((s) => s.kind === "charging").length;

  const subtitle = loading
    ? "Загрузка…"
    : error
      ? "Не удалось загрузить список"
      : filter === "charging"
        ? chargingCount > 0
          ? `${chargingCount} электростанций`
          : "Пока нет станций"
        : filter === "wash"
          ? `${washCount} автомоек`
          : `${stations.length} точек рядом`;

  return (
    <div className="pb-8">
      <section className="mx-auto max-w-5xl px-4 pt-4">
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Рядом</p>
          <h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Выберите точку
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>

        <div
          className="mb-4 flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60"
          role="tablist"
          aria-label="Тип точек"
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
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

        {loading ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : filter === "charging" && filtered.length === 0 ? (
          <ChargingEmptyState />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            По этому фильтру пока ничего нет
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
