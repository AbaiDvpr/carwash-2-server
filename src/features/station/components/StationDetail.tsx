"use client";

import Link from "next/link";
import type { Station } from "@/data/stations";
import { open2GisMap, openYandexMap } from "@/lib/mapController";

function washerTone(status: string | null) {
  switch (status) {
    case "free":
      return {
        box: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-400",
        label: "text-emerald-600 dark:text-emerald-400",
      };
    case "busy":
      return {
        box: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-400",
        label: "text-amber-600 dark:text-amber-400",
      };
    default:
      // offline
      return {
        box: "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60",
        text: "text-zinc-500 dark:text-zinc-400",
        label: "text-zinc-500 dark:text-zinc-400",
      };
  }
}

export default function StationDetail({ station }: { station: Station }) {
  const isOpen = station.status === "Открыто";
  const totalPosts = station.washers.length || station.washersTotal;
  const freeCount = station.washers.filter((w) => w.status === "free").length;

  return (
    <div className="pb-10">
      <section className="mx-auto max-w-2xl px-4 pt-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 6l-6 6 6 6" />
          </svg>
          Назад
        </Link>

        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-6 text-white">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                isOpen ? "bg-emerald-400/20 text-emerald-100" : "bg-white/15 text-white/70"
              }`}
            >
              {station.status}
            </span>
            <h1 className="mt-3 text-2xl font-bold">{station.name}</h1>
            <p className="mt-1 text-sm text-blue-100">{station.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800">
            <div className="bg-white px-5 py-4 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Свободно
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {freeCount}
              </p>
            </div>
            <div className="bg-white px-5 py-4 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Всего постов
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {totalPosts}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <div className="mb-3 flex items-end justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Посты
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {freeCount} из {totalPosts} свободно
              </p>
            </div>

            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Свободен
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Занят
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                Не в сети
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {station.washers.map((washer, index) => {
                const tone = washerTone(washer.status);
                return (
                  <div
                    key={washer.id}
                    className={`flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition ${tone.box}`}
                  >
                    <span className={`text-lg font-bold ${tone.text}`}>{index + 1}</span>
                    <span
                      className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${tone.label}`}
                    >
                      {washer.statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Маршрут
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={station.map_yandex}
                onClick={(event) => {
                  event.preventDefault();
                  openYandexMap(station.latitude, station.longitude, station.map_yandex);
                }}
                className="flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Яндекс Карты
              </a>
              <a
                href={station.map_2gis}
                onClick={(event) => {
                  event.preventDefault();
                  open2GisMap(station.latitude, station.longitude, station.map_2gis);
                }}
                className="flex items-center justify-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                2ГИС
              </a>
            </div>
          </div>

          {station.tariff.length > 0 ? (
            <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Тарифы
              </p>
              <div className="space-y-2">
                {station.tariff.map((tariff) => (
                  <div
                    key={tariff.title}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {tariff.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {tariff.description}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {tariff.price} ₸
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {station.market.length > 0 ? (
            <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Маркет
              </p>
              <div className="space-y-2">
                {station.market.map((market) => (
                  <div
                    key={market.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {market.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {market.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
