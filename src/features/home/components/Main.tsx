"use client";

import Link from "next/link";
import type { Station } from "@/data/stations";
import { useCwStations } from "@/hooks/useCwStations";
import { open2GisMap, openYandexMap } from "@/lib/mapController";

function StationCard({ station }: { station: Station }) {
  const isOpen = station.status === "Открыто";

  return (
    <article className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            isOpen
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {station.status}
        </span>
        <span className="text-xs text-zinc-400">
          {isOpen
            ? `${station.freeSlots} из ${station.washersTotal || station.washers.length} свободно`
            : "Нет мест"}
        </span>
      </div>

      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        <svg
          className="h-5 w-5"
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
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-50">
        {station.name}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{station.address}</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <a
          href={station.map_yandex}
          onClick={(event) => {
            event.preventDefault();
            openYandexMap(station.latitude, station.longitude, station.map_yandex);
          }}
          className="flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Яндекс
        </a>
        <a
          href={station.map_2gis}
          onClick={(event) => {
            event.preventDefault();
            open2GisMap(station.latitude, station.longitude, station.map_2gis);
          }}
          className="flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          2ГИС
        </a>
      </div>

      <Link
        href={`/station/${station.id}`}
        className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        Подробнее
      </Link>
    </article>
  );
}

export default function Main() {
  const { stations, loading, error } = useCwStations();

  return (
    <div className="pb-10">
      <section className="mx-auto max-w-5xl px-4 pt-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">
            Мойки рядом
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Выберите мойку
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Загрузка…"
              : error
                ? "Не удалось загрузить список"
                : `${stations.length} автомойки в вашем городе`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
