"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Station } from "@/data/stations";
import {
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import { useT } from "@/hooks/useT";
import { distanceKm } from "@/lib/api/geos";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import { navigateNavbar } from "@/lib/navbarController";

const YANDEX_LOGO = "/img/yandex_logo.svg";
const GIS_LOGO = "/img/gis_logo.svg";

type StationMapDrawerProps = {
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
};

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${km.toFixed(1)} км`;
}

function LoadRing({
  free,
  total,
  label,
}: {
  free: number;
  total: number;
  label: string;
}) {
  const safeTotal = Math.max(total, 1);
  const busyRatio = Math.min(1, Math.max(0, (safeTotal - free) / safeTotal));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - busyRatio);

  return (
    <div className="map-station-sheet__load">
      <div className="map-station-sheet__ring" aria-hidden>
        <svg viewBox="0 0 56 56">
          <circle className="map-station-sheet__ring-track" cx="28" cy="28" r={radius} />
          <circle
            className="map-station-sheet__ring-progress"
            cx="28"
            cy="28"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="map-station-sheet__ring-value">
          {free}
          <small>/{safeTotal}</small>
        </span>
      </div>
      <span className="map-station-sheet__load-label">{label}</span>
    </div>
  );
}

export default function StationMapDrawer({
  station,
  userLocation,
  onClose,
}: StationMapDrawerProps) {
  const t = useT();
  const [routeOpen, setRouteOpen] = useState(false);
  const isCharging = station.kind === "charging";
  const isOpen = station.status === "Открыто";

  const km = useMemo(() => {
    if (!userLocation) return null;
    return distanceKm(
      userLocation.latitude,
      userLocation.longitude,
      station.latitude,
      station.longitude,
    );
  }, [userLocation, station.latitude, station.longitude]);

  const statusLine = isOpen
    ? `${station.hoursLabel || t("station.open_short", "в работе")} · ${station.freeSlots} ${t("map.free", "свободно")}`
    : `${t("station.closed_short", "закрыто")} · ${station.hoursLabel || "—"}`;

  const connectors = (station.connectors ?? []).slice(0, 4);
  const tariffs = station.tariff.slice(0, 6);

  return (
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />

      <div
        className="map-station-sheet"
        role="dialog"
        aria-labelledby="map-station-sheet-title"
      >
        {station.photoUrl ? (
          <div className="map-station-sheet__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={station.photoUrl} alt="" />
          </div>
        ) : (
          <div
            className={`map-station-sheet__hero${isCharging ? " is-charging" : " is-wash"}`}
            aria-hidden
          />
        )}

        <div className="map-station-sheet__body">
          <div className="map-drawer__handle" aria-hidden />

          <div className="map-station-sheet__top">
            <div className="map-station-sheet__main">
              <span className="map-station-sheet__kind">
                {isCharging
                  ? t("common.charging", "ЭЗС")
                  : t("map.car_wash", "Автомойка")}
              </span>
              <h2 id="map-station-sheet-title" className="map-station-sheet__title">
                {station.address || station.name}
              </h2>
              <div className="map-station-sheet__status-row">
                <p
                  className={`map-station-sheet__status${isOpen ? " is-open" : ""}`}
                >
                  {statusLine}
                </p>
                {km != null ? (
                  <span className="map-station-sheet__distance">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {formatDistanceLabel(km)}
                  </span>
                ) : null}
              </div>
            </div>

            <LoadRing
              free={station.freeSlots}
              total={station.washersTotal}
              label={t("map.load", "Загрузка")}
            />
          </div>

          {isCharging && connectors.length > 0 ? (
            <div className="map-station-sheet__connectors">
              {connectors.map((connector) => (
                <span key={connector.slug} className="map-station-sheet__chip">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                  </svg>
                  {connector.powerKw != null
                    ? `${connector.label} · ${Math.round(connector.powerKw)} кВт`
                    : connector.label}
                </span>
              ))}
              {station.pricePerKwh != null ? (
                <span className="map-station-sheet__chip is-price">
                  {formatPricePerKwh(station.pricePerKwh)}
                </span>
              ) : null}
            </div>
          ) : null}

          {isCharging && station.maxPowerKw != null ? (
            <p className="map-station-sheet__hint">
              {t("map.max_power", "Макс. мощность")}:{" "}
              {formatPowerKw(station.maxPowerKw)}
            </p>
          ) : null}

          <div className="map-station-sheet__cta">
            <button
              type="button"
              className="map-station-sheet__btn map-station-sheet__btn--route"
              onClick={() => setRouteOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              {t("map.route", "Маршрут")}
            </button>
            <button
              type="button"
              className="map-station-sheet__btn map-station-sheet__btn--pay"
              onClick={() => navigateNavbar("qr")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"
                />
                <path strokeLinecap="round" d="M7 7h4v4H7zM13 7h1M16 7h1M13 10h1M16 10h1M13 13h4v4h-1M7 13h1M7 16h1" />
              </svg>
              {t("map.scan_qr", "Сканировать QR")}
            </button>
          </div>

          {tariffs.length > 0 ? (
            <div className="map-station-sheet__tariffs">
              {tariffs.map((item, index) => (
                <article
                  key={item.id ?? `${item.title}-${index}`}
                  className={`map-station-sheet__tariff map-station-sheet__tariff--${(index % 3) + 1}`}
                >
                  <p className="map-station-sheet__tariff-title">{item.title}</p>
                  <p className="map-station-sheet__tariff-price">
                    {Number.isFinite(item.price)
                      ? `${item.price.toLocaleString("ru-RU")} ₸`
                      : "—"}
                  </p>
                  {item.description ? (
                    <p className="map-station-sheet__tariff-desc">{item.description}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          <Link href={`/station/${station.id}`} className="map-station-sheet__more">
            {t("common.more", "Подробнее")}
          </Link>
        </div>
      </div>

      {routeOpen ? (
        <>
          <button
            type="button"
            className="map-drawer__backdrop map-drawer__backdrop--route"
            onClick={() => setRouteOpen(false)}
            aria-label={t("common.close", "Закрыть")}
          />
          <div
            className="map-route-sheet"
            role="dialog"
            aria-label={t("map.build_route", "Проложить маршрут")}
          >
            <div className="map-drawer__handle" aria-hidden />
            <h3 className="map-route-sheet__title">
              {t("map.build_route", "Проложить маршрут")}
            </h3>
            <ul className="map-route-sheet__list">
              <li>
                <button
                  type="button"
                  className="map-route-sheet__item"
                  onClick={() => {
                    openYandexMap(
                      station.latitude,
                      station.longitude,
                      station.map_yandex,
                    );
                    setRouteOpen(false);
                  }}
                >
                  <span className="map-route-sheet__icon">
                    <img src={YANDEX_LOGO} alt="" width={18} height={18} />
                  </span>
                  {t("map.yandex_nav", "Яндекс Карты")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="map-route-sheet__item"
                  onClick={() => {
                    open2GisMap(
                      station.latitude,
                      station.longitude,
                      station.map_2gis,
                    );
                    setRouteOpen(false);
                  }}
                >
                  <span className="map-route-sheet__icon">
                    <img src={GIS_LOGO} alt="" width={18} height={18} />
                  </span>
                  2GIS
                </button>
              </li>
            </ul>
          </div>
        </>
      ) : null}
    </>
  );
}
