"use client";

import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
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
      return {
        box: "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60",
        text: "text-zinc-500 dark:text-zinc-400",
        label: "text-zinc-500 dark:text-zinc-400",
      };
  }
}

export default function StationDetail({ station }: { station: Station }) {
  const isOpen = station.status === "Открыто";
  const isCharging = station.kind === "charging";
  const totalPosts = station.washers.length || station.washersTotal;
  const freeCount = station.washers.filter((w) => w.status === "free").length;
  const slotsTitle = isCharging ? "Коннекторы" : "Посты";

  return (
    <div className="page-content">
        <div className="mb-3">
          <BackButton href="/" />
        </div>

        <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {station.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={station.photoUrl}
              alt={station.name}
              className="h-36 w-full object-cover"
            />
          ) : (
            <div
              className={[
                "relative flex h-28 w-full items-end px-3 pb-2.5",
                isCharging
                  ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-zinc-800"
                  : "bg-gradient-to-br from-sky-600 via-blue-600 to-zinc-800",
              ].join(" ")}
            >
              <p className="text-xs font-medium text-white/90">
                {isCharging ? "Электростанция" : "Фото появится позже"}
              </p>
            </div>
          )}

          <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                isOpen
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {station.status}
            </span>
            <h1 className="mt-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {station.name}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{station.address}</p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {isOpen ? `Открыто · ${station.hoursLabel}` : `Закрыто · ${station.hoursLabel}`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800">
            <div className="bg-white px-3 py-2.5 dark:bg-zinc-950">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Свободно
              </p>
              <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {freeCount}
              </p>
            </div>
            <div className="bg-white px-3 py-2.5 dark:bg-zinc-950">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Всего
              </p>
              <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {totalPosts}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-end justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                {slotsTitle}
              </p>
              <p className="text-[11px] text-zinc-500">
                {freeCount} из {totalPosts}
              </p>
            </div>

            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Свободен
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Занят
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                Не в сети
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {station.washers.map((washer, index) => {
                const tone = washerTone(washer.status);
                return (
                  <div
                    key={washer.id}
                    className={`flex min-h-[3.5rem] flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center ${tone.box}`}
                  >
                    <span className={`text-sm font-semibold ${tone.text}`}>{index + 1}</span>
                    <span className={`mt-0.5 text-[9px] font-medium uppercase ${tone.label}`}>
                      {washer.statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              На карте
            </p>
            <Link
              href={`/?map=1&station=${encodeURIComponent(station.id)}`}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7v13M15 4v13" />
              </svg>
              Посмотреть на карте
            </Link>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Маршрут
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={station.map_yandex}
                onClick={(event) => {
                  event.preventDefault();
                  openYandexMap(station.latitude, station.longitude, station.map_yandex);
                }}
                className="flex items-center justify-center rounded-lg bg-zinc-900 px-2 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Яндекс
              </a>
              <a
                href={station.map_2gis}
                onClick={(event) => {
                  event.preventDefault();
                  open2GisMap(station.latitude, station.longitude, station.map_2gis);
                }}
                className="flex items-center justify-center rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                2ГИС
              </a>
            </div>
          </div>

          {station.tariff.length > 0 ? (
            <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Тарифы
              </p>
              <div className="space-y-1.5">
                {station.tariff.map((tariff) => (
                  <div
                    key={tariff.id ?? tariff.title}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                        {tariff.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">{tariff.description}</p>
                    </div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                      {tariff.price} ₸
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {station.market.length > 0 ? (
            <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Маркет
              </p>
              <div className="space-y-1.5">
                {station.market.map((market) => (
                  <div
                    key={market.id}
                    className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                  >
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                      {market.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">{market.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
    </div>
  );
}
