"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BackButton from "@/components/ui/BackButton";
import type {
  Station,
  StationConnectorPort,
} from "@/data/stations";
import {
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import "@/features/home/components/map.css";
import { useT, useLocale } from "@/hooks/useT";
import { localizeWashTariff } from "@/lib/api/cw";
import { open2GisMap, openYandexMap } from "@/lib/mapController";

const YANDEX_LOGO = "/img/yandex_logo.svg";
const GIS_LOGO = "/img/gis_logo.svg";

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

function NoPhotoThumb() {
  return (
    <span className="map-no-photo" aria-hidden>
      Нет фото
    </span>
  );
}

function MediaThumb({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <NoPhotoThumb />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function MetaIcons({
  pricePerKwh,
  powerKw,
}: {
  pricePerKwh: number | null | undefined;
  powerKw: number | null | undefined;
}) {
  return (
    <span className="map-ev-meta">
      <span className="map-ev-meta__item">
        {formatPricePerKwh(pricePerKwh ?? null)}
      </span>
      <span className="map-ev-meta__item">
        {powerKw != null ? formatPowerKw(powerKw) : "—"}
      </span>
    </span>
  );
}

function ConnectorPickCard({
  port,
  selected,
  onSelect,
}: {
  port: StationConnectorPort;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const isCharging = port.status === "charging" || port.status === "busy";
  const isFree = port.status === "free";
  const selectable = isFree && typeof onSelect === "function";
  const percent =
    port.chargePercent != null && Number.isFinite(port.chargePercent)
      ? port.chargePercent
      : null;

  const body = (
    <>
      <div className="map-conn-card__media" aria-hidden>
        <MediaThumb src={port.photoUrl} className="map-conn-card__photo" />
      </div>
      <div className="map-conn-card__body">
        <h3 className="map-conn-card__title">{port.label}</h3>
        <MetaIcons pricePerKwh={port.pricePerKwh} powerKw={port.powerKw} />
      </div>
      <div className="map-conn-card__state">
        {isCharging ? (
          <span className="map-conn-card__charge">
            {percent != null ? `${percent}%` : "Зарядка"}
          </span>
        ) : isFree ? (
          <span className={`map-conn-card__radio${selected ? " is-on" : ""}`} aria-hidden />
        ) : (
          <span className="map-conn-card__offline">{port.statusLabel}</span>
        )}
      </div>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={`map-conn-card is-free is-pickable${selected ? " is-selected" : ""}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {body}
      </button>
    );
  }

  return (
    <article className={`map-conn-card${isCharging ? " is-charging" : ""}`}>
      {body}
    </article>
  );
}

export default function StationDetail({ station }: { station: Station }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [selectedStandId, setSelectedStandId] = useState<number | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const isOpen = station.status === "Открыто";
  const isCharging = station.kind === "charging";
  const chargerStands = station.chargerStands ?? [];
  const washTariffs = station.tariff.map((tariff) =>
    localizeWashTariff(tariff, locale),
  );
  const selectedStand =
    selectedStandId == null
      ? null
      : (chargerStands.find((s) => s.id === selectedStandId) ?? null);
  const routeYandex = selectedStand?.mapYandex || station.map_yandex;
  const route2gis = selectedStand?.map2gis || station.map_2gis;
  const totalPosts = station.washers.length || station.washersTotal;
  const freeCount = station.washers.filter((w) => w.status === "free").length;
  const slotsTitle = isCharging
    ? t("map.pick_station", "Выберите станцию")
    : t("station.posts", "Посты");

  function handleBack() {
    if (selectedStand) {
      setSelectedStandId(null);
      setSelectedPortId(null);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/map");
  }

  return (
    <div className="page-content">
        <div className="app-back-bar">
          <BackButton onClick={handleBack}>
            {selectedStand
              ? t("map.back_to_stations", "К станциям")
              : t("common.back", "Назад")}
          </BackButton>
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
            <div className="flex h-28 w-full items-center justify-center bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Нет фото
            </div>
          )}

          <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 text-[0.75rem] font-medium uppercase tracking-wide ${
                isOpen
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isOpen
                ? t("station.open_short", "Открыто")
                : t("station.closed_short", "Закрыто")}
            </span>
            <h1 className="mt-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {station.name}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{station.address}</p>
            <p className="mt-2 text-[0.8125rem] font-medium text-zinc-700 dark:text-zinc-300">
              <span className="font-normal text-zinc-400 dark:text-zinc-500">
                {t("station.hours_today", "Режим сегодня")}
                {": "}
              </span>
              {station.hoursLabel || t("station.hours_unknown", "Часы уточняйте")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800">
            <div className="bg-white px-3 py-2.5 dark:bg-zinc-950">
              <p className="text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
                {t("station.free", "Свободно")}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {freeCount}
              </p>
            </div>
            <div className="bg-white px-3 py-2.5 dark:bg-zinc-950">
              <p className="text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
                {t("station.total", "Всего")}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {totalPosts}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            {isCharging && selectedStand ? (
              <>
                <div className="map-conn-step__head">
                  <button
                    type="button"
                    className="map-conn-step__back"
                    onClick={() => setSelectedStandId(null)}
                    aria-label={t("map.back_to_stations", "К станциям")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" d="m15 6-6 6 6 6" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="map-conn-step__title">
                      {t("map.pick_connector", "Выберите коннектор")}
                    </h2>
                    <p className="map-conn-step__parent">
                      {selectedStand.title}
                      {selectedStand.powerKw != null
                        ? ` · ${formatPowerKw(selectedStand.powerKw)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="map-conn-step__list" style={{ marginTop: "0.75rem" }}>
                  {selectedStand.ports.map((port) => (
                    <ConnectorPickCard
                      key={port.id}
                      port={port}
                      selected={selectedPortId === port.id}
                      onSelect={
                        port.status === "free"
                          ? () =>
                              setSelectedPortId((prev) =>
                                prev === port.id ? null : port.id,
                              )
                          : undefined
                      }
                    />
                  ))}
                </div>

                {selectedStand.ports.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {t("map.no_connectors", "Нет коннекторов на этой стойке")}
                  </p>
                ) : null}

                <p className="map-conn-step__hint">
                  {selectedPortId
                    ? t(
                        "map.route_stand_hint",
                        "Маршрут откроется к этой стойке (2ГИС / Яндекс).",
                      )
                    : t(
                        "map.pick_connector_route",
                        "Отметьте свободный коннектор галочкой, затем проложите маршрут.",
                      )}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedPortId}
                    onClick={() =>
                      openYandexMap(station.latitude, station.longitude, routeYandex)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <img src={YANDEX_LOGO} alt="" width={18} height={18} />
                    Яндекс
                  </button>
                  <button
                    type="button"
                    disabled={!selectedPortId}
                    onClick={() =>
                      open2GisMap(station.latitude, station.longitude, route2gis)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <img src={GIS_LOGO} alt="" width={18} height={18} />
                    2ГИС
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 flex items-end justify-between gap-2">
                  <p className="text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
                    {slotsTitle}
                  </p>
                  <p className="text-[0.8125rem] text-zinc-500">
                    {freeCount} из {totalPosts}
                  </p>
                </div>

                {isCharging && chargerStands.length > 0 ? (
                  <div className="map-stand-pick-list__items">
                    {chargerStands.map((stand) => (
                      <button
                        key={stand.id}
                        type="button"
                        className="map-stand-pick"
                        onClick={() => {
                          setSelectedStandId(stand.id);
                          setSelectedPortId(null);
                        }}
                      >
                        <span className="map-stand-pick__main">
                          <span className="map-stand-pick__title">{stand.title}</span>
                          <MetaIcons
                            pricePerKwh={stand.pricePerKwh}
                            powerKw={stand.powerKw}
                          />
                        </span>
                        <svg
                          className="map-stand-pick__chevron"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden
                        >
                          <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : null}

                {isCharging && chargerStands.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    {t("map.max_power", "Макс. мощность")}:{" "}
                    {formatPowerKw(station.maxPowerKw)}
                    {station.pricePerKwh != null
                      ? ` · ${formatPricePerKwh(station.pricePerKwh)}`
                      : ""}
                  </p>
                ) : null}

                {!isCharging ? (
                  <>
                    <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem] text-zinc-500">
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
                            <span className={`text-sm font-semibold ${tone.text}`}>
                              {index + 1}
                            </span>
                            <span
                              className={`mt-0.5 text-[0.6875rem] font-medium uppercase ${tone.label}`}
                            >
                              {washer.statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
              {t("station.on_map", "На карте")}
            </p>
            <Link
              href={`/map?station=${encodeURIComponent(station.id)}`}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7v13M15 4v13" />
              </svg>
              {t("station.view_map", "Посмотреть на карте")}
            </Link>
            <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
              {t("map.route", "Маршрут")}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={station.map_yandex}
                onClick={(event) => {
                  event.preventDefault();
                  openYandexMap(station.latitude, station.longitude, station.map_yandex);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <img src={YANDEX_LOGO} alt="" width={18} height={18} />
                Яндекс
              </a>
              <a
                href={station.map_2gis}
                onClick={(event) => {
                  event.preventDefault();
                  open2GisMap(station.latitude, station.longitude, station.map_2gis);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <img src={GIS_LOGO} alt="" width={18} height={18} />
                2ГИС
              </a>
            </div>
          </div>

          {!isCharging && washTariffs.length > 0 ? (
            <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
                {t("payment.tariffs", "Тарифы")}
              </p>
              <div className="space-y-1.5">
                {washTariffs.map((tariff) => (
                  <div
                    key={tariff.id ?? tariff.title}
                    className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                        {tariff.title}
                      </p>
                      {tariff.description ? (
                        <p className="text-[0.8125rem] text-zinc-500">{tariff.description}</p>
                      ) : null}
                      {tariff.items && tariff.items.length > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {tariff.items.map((item) => (
                            <li key={item} className="text-[0.8125rem] text-zinc-500">
                              · {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-xs font-medium text-zinc-900 dark:text-zinc-50">
                      {tariff.price} ₸
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {station.market.length > 0 ? (
            <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wider text-zinc-400">
                {t("station.market", "Маркет")}
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
                    <p className="text-[0.8125rem] text-zinc-500">{market.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
    </div>
  );
}
