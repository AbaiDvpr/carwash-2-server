"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Station,
  StationChargerStand,
  StationConnectorPort,
} from "@/data/stations";
import {
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import { useMapSheetDrag } from "@/features/map/useMapSheetDrag";
import { useStation } from "@/hooks/useStation";
import { useLocale, useT } from "@/hooks/useT";
import { localizeWashTariff } from "@/lib/api/cw";
import { distanceKm } from "@/lib/api/geos";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import { navigateNavbar } from "@/lib/navbarController";
import {
  buildWeeklyHoursSchedule,
  type WeekHoursRow,
} from "@/lib/openHours";

const YANDEX_LOGO = "/img/yandex_logo.svg";
const GIS_LOGO = "/img/gis_logo.svg";

type StationMapDrawerProps = {
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
};

function SheetCloseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className="map-drawer__close"
      onClick={onClick}
      aria-label={t("common.close", "Закрыть")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function SheetBackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const t = useT();
  return (
    <button
      type="button"
      className="map-conn-step__back"
      onClick={onClick}
      aria-label={label ?? t("common.back", "Назад")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" d="m15 6-6 6 6 6" />
      </svg>
    </button>
  );
}


function QrScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h3v3H8V8Zm5 0h3v3h-3V8ZM8 13h3v3H8v-3Zm5 2h1v1h-1v-1Zm2-2h1v3h-3v-1h2v-2Z" />
    </svg>
  );
}

function RouteButton({
  disabled = false,
  onClick,
  active = false,
}: {
  disabled?: boolean;
  onClick: () => void;
  active?: boolean;
}) {
  const t = useT();
  const label = t("map.build_route", "Проложить маршрут");
  return (
    <button
      type="button"
      className={`map-station-sheet__btn map-station-sheet__btn--route map-station-sheet__btn--icon${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
    >
      {/* Маршрут: старт → путь → финиш */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="6" cy="19" r="2.5" />
        <circle cx="17" cy="5" r="2.5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19h8.5a3.5 3.5 0 1 0 0-7h-11a3.5 3.5 0 1 1 0-7H15"
        />
      </svg>
    </button>
  );
}

function ScanQrButton() {
  const t = useT();
  const label = t("map.scan_qr", "Сканировать QR");
  return (
    <button
      type="button"
      className="map-station-sheet__btn map-station-sheet__btn--pay map-station-sheet__btn--icon"
      onClick={() => navigateNavbar("qr")}
      aria-label={label}
      title={label}
    >
      <QrScanIcon />
    </button>
  );
}

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} км`;
  return `${Math.round(km)} км`;
}

/** «сегодня с 09:00 до 22:00» → «09:00 – 22:00» */
function compactHoursLabel(hoursLabel: string): string {
  const raw = hoursLabel.trim();
  if (!raw) return "Часы уточняйте";
  if (/круглосут/i.test(raw)) return "Круглосуточно";
  const range = raw.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
  if (range) return `${range[1]} – ${range[2]}`;
  return raw.replace(/^сегодня\s+/i, "") || "Часы уточняйте";
}

type StatusTone = "free" | "busy" | "charging" | "offline";

function postTone(status: string | null | undefined): StatusTone {
  if (status === "free") return "free";
  if (status === "charging") return "charging";
  if (status === "busy" || status === "occupied") return "busy";
  return "offline";
}

function StatusLegend() {
  const t = useT();
  return (
    <div className="map-status-legend" aria-hidden>
      <span className="map-status-legend__item">
        <span className="map-status-legend__dot is-free" />
        {t("map.status_free", "Свободен")}
      </span>
      <span className="map-status-legend__item">
        <span className="map-status-legend__dot is-busy" />
        {t("map.status_busy", "Занят")}
      </span>
      <span className="map-status-legend__item">
        <span className="map-status-legend__dot is-offline" />
        {t("map.status_offline", "Не в сети")}
      </span>
    </div>
  );
}

function WashPostsGrid({
  washers,
}: {
  washers: Station["washers"];
}) {
  const t = useT();
  if (washers.length === 0) return null;

  return (
    <div className="map-status-block">
      <div className="map-status-block__head">
        <p className="map-status-block__title">
          {t("map.posts", "Посты")}
          <span className="map-status-block__count">{washers.length}</span>
        </p>
        <StatusLegend />
      </div>
      <div className="map-status-grid">
        {washers.map((washer, index) => {
          const tone = postTone(washer.status);
          return (
            <div
              key={washer.id}
              className={`map-status-cell map-status-cell--${tone}`}
            >
              <span className="map-status-cell__num">{index + 1}</span>
              <span className="map-status-cell__status">
                {washer.statusLabel || tone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NoPhotoThumb({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`map-no-photo${compact ? " is-compact" : ""}`} aria-hidden>
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
    return <NoPhotoThumb compact />;
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

function ConnectorInfoCard({ port }: { port: StationConnectorPort }) {
  const isCharging = port.status === "charging" || port.status === "busy";
  const isFree = port.status === "free";
  const percent =
    port.chargePercent != null && Number.isFinite(port.chargePercent)
      ? port.chargePercent
      : null;

  return (
    <article
      className={`map-conn-card${isCharging ? " is-charging" : ""}${isFree ? " is-free" : ""}`}
    >
      <div className="map-conn-card__media" aria-hidden>
        <MediaThumb src={port.photoUrl} className="map-conn-card__photo" />
      </div>
      <div className="map-conn-card__body">
        <h3 className="map-conn-card__title">{port.label}</h3>
        <MetaIcons pricePerKwh={port.pricePerKwh} powerKw={port.powerKw} />
      </div>
      <div className="map-conn-card__state">
        {isCharging ? (
          <span className="map-conn-card__charge" title={port.statusLabel}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 4h10a2 2 0 0 1 2 2v14a1 1 0 0 1-1.45.9L12 18.2l-5.55 2.7A1 1 0 0 1 5 20V6a2 2 0 0 1 2-2Zm1 3v7.2l4-1.95 4 1.95V7H8Z" />
            </svg>
            {percent != null ? `${percent}%` : "Зарядка"}
          </span>
        ) : isFree ? (
          <span className="map-conn-card__free">{port.statusLabel || "Свободен"}</span>
        ) : (
          <span className="map-conn-card__offline">{port.statusLabel}</span>
        )}
      </div>
    </article>
  );
}

function StandPickButton({
  stand,
  onOpen,
}: {
  stand: StationChargerStand;
  onOpen: () => void;
}) {
  const t = useT();
  const free = stand.ports.filter((p) => p.status === "free").length;
  const total = stand.ports.length;

  return (
    <button type="button" className="map-stand-pick" onClick={onOpen}>
      <span className="map-stand-pick__main">
        <span className="map-stand-pick__title-row">
          <span className="map-stand-pick__title">{stand.title}</span>
          {total > 0 ? (
            <span className="map-stand-pick__live">
              {free}/{total} {t("map.free", "свободно")}
            </span>
          ) : null}
        </span>
        <MetaIcons pricePerKwh={stand.pricePerKwh} powerKw={stand.powerKw} />
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
  );
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

function HoursScheduleList({ rows }: { rows: WeekHoursRow[] }) {
  const t = useT();
  if (rows.length === 0) {
    return (
      <p className="map-hours-schedule__empty">
        {t("station.hours_unknown", "Часы уточняйте")}
      </p>
    );
  }

  return (
    <ul className="map-hours-schedule__list">
      {rows.map((row) => (
        <li
          key={row.dayIndex}
          className={`map-hours-schedule__row${row.isToday ? " is-today" : ""}`}
        >
          <span className="map-hours-schedule__day">
            {row.shortLabel}
            {row.isToday ? (
              <span className="map-hours-schedule__today">
                {t("map.today", "сегодня")}
              </span>
            ) : null}
          </span>
          <span className="map-hours-schedule__hours">{row.hours}</span>
        </li>
      ))}
    </ul>
  );
}

function RouteAppsList({
  latitude,
  longitude,
  mapYandex,
  map2gis,
  onPicked,
}: {
  latitude: number;
  longitude: number;
  mapYandex?: string | null;
  map2gis?: string | null;
  onPicked?: () => void;
}) {
  const t = useT();
  return (
    <ul className="map-route-sheet__list">
      <li>
        <button
          type="button"
          className="map-route-sheet__item"
          onClick={() => {
            openYandexMap(latitude, longitude, mapYandex ?? undefined);
            onPicked?.();
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
            open2GisMap(latitude, longitude, map2gis ?? undefined);
            onPicked?.();
          }}
        >
          <span className="map-route-sheet__icon">
            <img src={GIS_LOGO} alt="" width={18} height={18} />
          </span>
          2ГИС
        </button>
      </li>
    </ul>
  );
}

function DrawerLoading({ label }: { label: string }) {
  return (
    <div className="map-station-sheet__loading-panel" role="status" aria-live="polite">
      <span className="map-station-sheet__spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}

export default function StationMapDrawer({
  station: initialStation,
  userLocation,
  onClose,
}: StationMapDrawerProps) {
  const t = useT();
  const locale = useLocale();
  const [routeOpen, setRouteOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [selectedStandId, setSelectedStandId] = useState<number | null>(null);
  const {
    station: freshStation,
    loading,
    error: stationError,
    reload,
  } = useStation(initialStation.id);
  const station = freshStation ?? initialStation;
  const bootLoading = loading && !freshStation;
  const [stationPhotoFailed, setStationPhotoFailed] = useState(false);
  const [stationPhotoLoading, setStationPhotoLoading] = useState(
    () => Boolean(initialStation.photoUrl),
  );
  const [stationPhotoReady, setStationPhotoReady] = useState(false);
  const showStationPhoto = Boolean(station.photoUrl) && !stationPhotoFailed;

  useEffect(() => {
    const url = station.photoUrl;
    setStationPhotoFailed(false);
    setStationPhotoReady(false);

    if (!url) {
      setStationPhotoLoading(false);
      return;
    }

    let cancelled = false;
    let settleTimer: number | null = null;
    const startedAt = Date.now();
    /** Минимум прелоадера — иначе из кэша фото «прыгает» без плавного появления */
    const MIN_PRELOADER_MS = 380;

    setStationPhotoLoading(true);

    const settleOk = () => {
      const wait = Math.max(0, MIN_PRELOADER_MS - (Date.now() - startedAt));
      settleTimer = window.setTimeout(() => {
        if (cancelled) return;
        setStationPhotoReady(true);
        setStationPhotoLoading(false);
      }, wait);
    };

    const settleErr = () => {
      if (cancelled) return;
      setStationPhotoLoading(false);
      setStationPhotoReady(false);
      setStationPhotoFailed(true);
    };

    const img = new window.Image();
    img.onload = settleOk;
    img.onerror = settleErr;
    img.src = url;

    if (img.complete) {
      if (img.naturalWidth > 0) settleOk();
      else settleErr();
    }

    return () => {
      cancelled = true;
      if (settleTimer != null) window.clearTimeout(settleTimer);
    };
  }, [station.photoUrl, initialStation.id]);

  const { sheetStyle, scrollProps, sheetProps } = useMapSheetDrag({
    onClose,
    dragEnabled: false,
    expandable: false,
  });
  const sheetNodeRef = useRef<HTMLDivElement | null>(null);
  const isCharging = station.kind === "charging";

  const toggleRoute = () => {
    setHoursOpen(false);
    setRouteOpen(true);
  };

  const closeRoute = () => setRouteOpen(false);

  const openStand = (standId: number) => {
    setSelectedStandId(standId);
    setRouteOpen(false);
    setHoursOpen(false);
  };

  const closeStand = () => {
    setSelectedStandId(null);
    setRouteOpen(false);
    setHoursOpen(false);
  };

  const closeHours = () => setHoursOpen(false);

  const dismissAll = () => {
    setHoursOpen(false);
    setRouteOpen(false);
    onClose();
  };

  useEffect(() => {
    setSelectedStandId(null);
    setRouteOpen(false);
    setHoursOpen(false);
  }, [initialStation.id]);

  const km = useMemo(() => {
    if (!userLocation) return null;
    return distanceKm(
      userLocation.latitude,
      userLocation.longitude,
      station.latitude,
      station.longitude,
    );
  }, [userLocation, station.latitude, station.longitude]);

  const hoursText = compactHoursLabel(
    station.hoursLabel || t("station.hours_unknown", "Часы уточняйте"),
  );

  const weekHours = useMemo(
    () => buildWeeklyHoursSchedule(station.openHours),
    [station.openHours],
  );

  const chargerStands = station.chargerStands ?? [];
  const washTariffs = !isCharging
    ? station.tariff.map((tariff) => localizeWashTariff(tariff, locale))
    : [];
  const selectedStand =
    selectedStandId == null
      ? null
      : (chargerStands.find((s) => s.id === selectedStandId) ?? null);

  useEffect(() => {
    if (!showStationPhoto) {
      document.documentElement.classList.remove("map-sheet-photo-on");
      document.documentElement.style.removeProperty("--map-sheet-h");
      return;
    }

    const apply = () => {
      const sheetH = sheetNodeRef.current?.offsetHeight;
      if (sheetH && sheetH > 0) {
        document.documentElement.style.setProperty(
          "--map-sheet-h",
          `${Math.round(sheetH)}px`,
        );
      }
      document.documentElement.classList.add("map-sheet-photo-on");
    };

    apply();
    const ro = new ResizeObserver(apply);
    if (sheetNodeRef.current) ro.observe(sheetNodeRef.current);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.classList.remove("map-sheet-photo-on");
      document.documentElement.style.removeProperty("--map-sheet-h");
    };
  }, [showStationPhoto, initialStation.id, routeOpen, hoursOpen, selectedStandId]);

  return (
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={dismissAll}
        aria-label={t("common.close", "Закрыть")}
      />

      {showStationPhoto ? (
        <div
          className={`map-station-photo-layer is-visible${stationPhotoLoading ? " is-loading" : ""}${stationPhotoReady ? " is-ready" : ""}`}
          aria-busy={stationPhotoLoading}
          aria-hidden={false}
        >
          <div className="map-station-photo-layer__loader" role="status">
            <span className="map-station-photo-layer__spinner" aria-hidden />
            <span className="map-station-photo-layer__label">
              {t("map.loading_photo", "Загружается фото…")}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={station.photoUrl ?? initialStation.id}
            src={station.photoUrl!}
            alt=""
            draggable={false}
            decoding="async"
          />
        </div>
      ) : null}

      <div
        className={`map-station-sheet is-peek${showStationPhoto ? " has-photo-static" : " is-compact-only"}${loading ? " is-refreshing" : ""}`}
        role="dialog"
        aria-labelledby="map-station-sheet-title"
        aria-busy={loading}
        style={sheetStyle}
        {...sheetProps}
        ref={(node) => {
          sheetNodeRef.current = node;
          const { ref } = sheetProps;
          if (typeof ref === "function") ref(node);
        }}
      >
        <div className="map-station-sheet__toolbar">
          <div className="map-conn-step__head map-conn-step__head--toolbar">
            <SheetBackButton
              onClick={
                hoursOpen
                  ? closeHours
                  : routeOpen
                    ? closeRoute
                    : selectedStand
                      ? closeStand
                      : dismissAll
              }
            />
            {hoursOpen ? (
              <div className="min-w-0 flex-1">
                <h2 id="map-station-sheet-title" className="map-conn-step__title">
                  {t("map.hours_schedule", "График работы")}
                </h2>
                <p className="map-conn-step__parent">
                  {station.address || station.name}
                </p>
              </div>
            ) : routeOpen ? (
              <div className="min-w-0 flex-1">
                <h2 id="map-station-sheet-title" className="map-conn-step__title">
                  {t("map.build_route", "Проложить маршрут")}
                </h2>
                <p className="map-conn-step__parent">
                  {station.address || station.name}
                </p>
              </div>
            ) : selectedStand ? (
              <div className="min-w-0 flex-1">
                <h2 id="map-station-sheet-title" className="map-conn-step__title">
                  {selectedStand.title}
                </h2>
                <p className="map-conn-step__parent">
                  {selectedStand.powerKw != null
                    ? formatPowerKw(selectedStand.powerKw)
                    : null}
                  {selectedStand.powerKw != null &&
                  selectedStand.pricePerKwh != null
                    ? " · "
                    : null}
                  {selectedStand.pricePerKwh != null
                    ? formatPricePerKwh(selectedStand.pricePerKwh)
                    : null}
                </p>
              </div>
            ) : (
              <div className="map-station-sheet__toolbar-spacer" aria-hidden />
            )}
          </div>
          {!hoursOpen && !routeOpen ? (
            <div className="map-station-sheet__toolbar-actions">
              {!selectedStand ? (
                <RouteButton onClick={toggleRoute} active={routeOpen} />
              ) : null}
              <ScanQrButton />
            </div>
          ) : null}
          <SheetCloseButton onClick={dismissAll} />
        </div>

        {bootLoading ? (
          <DrawerLoading label={t("map.loading_station", "Загружаем данные…")} />
        ) : stationError && !freshStation ? (
          <div className="map-station-sheet__loading-panel">
            <p>{stationError}</p>
            <button
              type="button"
              className="map-station-sheet__btn map-station-sheet__btn--route"
              onClick={() => reload()}
            >
              {t("common.retry", "Повторить")}
            </button>
          </div>
        ) : hoursOpen ? (
          <div className="map-station-sheet__body" {...scrollProps}>
            <HoursScheduleList rows={weekHours} />
          </div>
        ) : routeOpen ? (
          <div className="map-station-sheet__body" {...scrollProps}>
            <RouteAppsList
              latitude={station.latitude}
              longitude={station.longitude}
              mapYandex={station.map_yandex}
              map2gis={station.map_2gis}
              onPicked={closeRoute}
            />
          </div>
        ) : selectedStand ? (
          <div className="map-station-sheet__body" {...scrollProps}>
            <p className="map-stand-pick-list__label">
              {t("map.connectors", "Коннекторы")}
            </p>

            <div className="map-conn-step__list">
              {selectedStand.ports.length === 0 ? (
                <p className="map-stand__empty">
                  {t("map.no_connectors", "Нет коннекторов на этой стойке")}
                </p>
              ) : (
                selectedStand.ports.map((port) => (
                  <ConnectorInfoCard key={port.id} port={port} />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="map-station-sheet__body" {...scrollProps}>
            <div className="map-station-sheet__top">
              <div className="map-station-sheet__main">
                <h2 id="map-station-sheet-title" className="map-station-sheet__title">
                  {station.address || station.name}
                </h2>
                <div className="map-station-sheet__meta">
                  <button
                    type="button"
                    className="map-station-sheet__meta-item map-station-sheet__meta-item--hours"
                    title={station.hoursLabel}
                    onClick={() => {
                      setRouteOpen(false);
                      setHoursOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 7v5l3 2" />
                    </svg>
                    <span>{hoursText}</span>
                    <svg
                      className="map-station-sheet__meta-chevron"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                  {km != null ? (
                    <span className="map-station-sheet__meta-item map-station-sheet__meta-item--distance">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {formatDistanceLabel(km)}
                    </span>
                  ) : null}
                </div>
              </div>

              {!isCharging ? (
                <LoadRing
                  free={station.freeSlots}
                  total={station.washersTotal}
                  label={t("map.load", "Загрузка")}
                />
              ) : null}
            </div>

            {!isCharging ? (
              <WashPostsGrid washers={station.washers} />
            ) : null}

            {isCharging && loading ? (
              <DrawerLoading
                label={t("map.loading_connectors", "Загружаем коннекторы…")}
              />
            ) : null}

            {isCharging && !loading && chargerStands.length > 0 ? (
              <div className="map-stand-pick-list">
                <p className="map-stand-pick-list__label">
                  {t("map.stands", "Стойки")}
                </p>
                <div className="map-stand-pick-list__items">
                  {chargerStands.map((stand) => (
                    <StandPickButton
                      key={stand.id}
                      stand={stand}
                      onOpen={() => openStand(stand.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {isCharging && !loading && chargerStands.length === 0 ? (
              <p className="map-station-sheet__hint">
                {t("map.max_power", "Макс. мощность")}:{" "}
                {formatPowerKw(station.maxPowerKw)}
                {station.pricePerKwh != null
                  ? ` · ${formatPricePerKwh(station.pricePerKwh)}`
                  : ""}
              </p>
            ) : null}

            {!isCharging && washTariffs.length > 0 ? (
              <div className="map-station-sheet__tariffs">
                <p className="map-station-sheet__tariffs-label">
                  {t("payment.tariffs", "Тарифы")}
                </p>
                <ul className="map-station-sheet__tariff-list">
                  {washTariffs.map((tariff) => (
                    <li
                      key={tariff.id ?? tariff.title}
                      className="map-station-sheet__tariff"
                    >
                      <div className="map-station-sheet__tariff-main">
                        <p className="map-station-sheet__tariff-title">
                          {tariff.title}
                        </p>
                        {tariff.description ? (
                          <p className="map-station-sheet__tariff-desc">
                            {tariff.description}
                          </p>
                        ) : null}
                        {tariff.items && tariff.items.length > 0 ? (
                          <ul className="map-station-sheet__tariff-items">
                            {tariff.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="map-station-sheet__tariff-desc">
                            {t("map.tariff_no_items", "Состав не указан")}
                          </p>
                        )}
                      </div>
                      <p className="map-station-sheet__tariff-price">
                        {Number.isFinite(tariff.price)
                          ? `${tariff.price.toLocaleString("ru-RU")} ₸`
                          : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link href={`/station/${station.id}`} className="map-station-sheet__more">
              {t("common.more", "Подробнее")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
