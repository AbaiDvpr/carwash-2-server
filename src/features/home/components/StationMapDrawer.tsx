"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  getPaymentPath,
  type Station,
  type StationChargerStand,
  type StationConnectorPort,
} from "@/data/stations";
import {
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import MarkerFaceContent from "@/features/map/MarkerFaceContent";
import MarkerProgress from "@/features/map/MarkerProgress";
import {
  markerColorStyle,
  markerStyleClass,
} from "@/features/map/markerStyles";
import { useMapMarkerStylePrefs } from "@/features/map/MapMarkerStyleDrawer";
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
import BackButton from "@/components/ui/BackButton";
import EvChargeFlow, {
  type EvChargeStep,
  type EvPhotoHeader,
} from "./EvChargeFlow";
import {
  detailsChargingPath,
  type MapLiveSession,
} from "@/features/home/mapLiveSession";

export type { MapLiveSession };

const YANDEX_LOGO = "/img/yandex_logo.svg";
const GIS_LOGO = "/img/gis_logo.svg";

type MapLiveResume = {
  standId: number;
  portId: number;
  step: EvChargeStep;
  chargeEndsAt: number | null;
  dbSessionId?: number | null;
};

type StationMapDrawerProps = {
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
  /** Свернуть активную сессию (мойка/зарядка) — остаётся alert на карте */
  onMinimize?: () => void;
  resumeSession?: MapLiveResume | null;
  onLiveSessionChange?: (session: MapLiveSession | null) => void;
  onPayNavigate?: () => void;
};

function SheetCloseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className="app-drawer-close"
      onClick={onClick}
      aria-label={t("common.close", "Закрыть")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}


function QrScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M3 16v5h5" />
      <path d="M21 16v5h-5" />
      <path d="M4 12h16" />
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

function HoursButton({
  disabled = false,
  onClick,
  active = false,
}: {
  disabled?: boolean;
  onClick: () => void;
  active?: boolean;
}) {
  const t = useT();
  const label = t("map.hours_schedule", "График работы");
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
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
      className="map-station-sheet__btn map-station-sheet__btn--route map-station-sheet__btn--icon"
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

function washStatusText(tone: StatusTone, t: (key: string, fallback: string) => string) {
  if (tone === "free") return t("map.status_free", "Свободен");
  if (tone === "busy" || tone === "charging") return t("map.status_busy", "Занят");
  return t("map.status_offline", "Не в сети");
}

function WashPostsGrid({
  washers,
}: {
  washers: Station["washers"];
}) {
  const t = useT();
  if (washers.length === 0) return null;

  return (
    <div className="map-status-block map-status-block--compact">
      <div className="map-status-grid map-status-grid--soft">
        {washers.map((washer, index) => {
          const tone = postTone(washer.status);
          return (
            <div
              key={washer.id}
              className={`map-status-cell map-status-cell--soft map-status-cell--${tone}`}
            >
              <span className="map-status-cell__num">{index + 1}</span>
              <span className="map-status-cell__status">
                {washStatusText(tone, t)}
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

function ConnectorInfoCard({
  port,
  onSelect,
}: {
  port: StationConnectorPort;
  onSelect?: (port: StationConnectorPort) => void;
}) {
  const t = useT();
  const isCharging = port.status === "charging" || port.status === "busy";
  const isFree = port.status === "free";
  const clickable = isFree && typeof onSelect === "function";

  const body = (
    <>
      <div className="map-conn-card__media" aria-hidden>
        <MediaThumb src={port.photoUrl} className="map-conn-card__photo" />
      </div>
      <div className="map-conn-card__body">
        <span className="map-conn-card__title">{port.label}</span>
      </div>
      <div className="map-conn-card__state">
        {isCharging ? (
          <span className="map-conn-card__charge">
            {t("map.status_busy_short", "занят")}
          </span>
        ) : isFree ? (
          <span className="map-conn-card__free">
            {t("map.free", "свободно")}
          </span>
        ) : (
          <span className="map-conn-card__offline">
            {t("map.status_offline_short", "не в сети")}
          </span>
        )}
      </div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className={`map-conn-card is-free is-pickable`}
        onClick={() => onSelect(port)}
      >
        {body}
      </button>
    );
  }

  return (
    <article
      className={`map-conn-card${isCharging ? " is-charging" : ""}${isFree ? " is-free" : ""}`}
    >
      {body}
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
  const hasFree = free > 0;

  return (
    <button
      type="button"
      className={`map-stand-pick${hasFree ? " is-free" : " is-busy"}`}
      onClick={onOpen}
    >
      <span className="map-stand-pick__main">
        <MetaIcons pricePerKwh={stand.pricePerKwh} powerKw={stand.powerKw} />
        <span className="map-stand-pick__title">{stand.title}</span>
      </span>
      <span className="map-stand-pick__aside map-stand-pick__aside--ports">
        {stand.ports.length > 0 ? (
          stand.ports.map((port) => {
            const tone = postTone(port.status);
            return (
              <span
                key={port.id}
                className={`map-stand-pick__port-chip is-status is-${tone}`}
                title={port.label}
              >
                {port.label}
              </span>
            );
          })
        ) : (
          <span className="map-stand-pick__ports-empty">
            {t("map.no_connectors_short", "Нет коннекторов")}
          </span>
        )}
      </span>
    </button>
  );
}

/** Тот же маркер, что на карте — иконка + свободно/всего */
function StationSheetMarker({ station }: { station: Station }) {
  const { prefs } = useMapMarkerStylePrefs();
  const isCharging = station.kind === "charging";
  const kindPrefs = isCharging ? prefs.charging : prefs.wash;
  const free = Math.max(0, station.freeSlots);
  const total = Math.max(station.washersTotal || 1, 1);
  const freeRatio = Math.min(1, Math.max(0, free / total));

  return (
    <div
      className="map-station-sheet__marker"
      title={`${free}/${total}`}
      aria-label={`${free} из ${total} свободно`}
    >
      <span
        className={`${markerStyleClass(isCharging ? "charging" : "wash", kindPrefs.shapeId)} map-marker--sheet map-marker--no-tip`}
        style={
          {
            "--map-marker-free": String(freeRatio),
            ...markerColorStyle(kindPrefs),
          } as CSSProperties
        }
        aria-hidden
      >
        <MarkerProgress free={free} total={total} />
        <span className="map-marker__face">
          <MarkerFaceContent
            kind={isCharging ? "charging" : "wash"}
            prefs={kindPrefs}
            free={free}
            total={total}
          />
        </span>
      </span>
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
  onMinimize,
  resumeSession = null,
  onLiveSessionChange,
  onPayNavigate,
}: StationMapDrawerProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const navigatedToDetailsRef = useRef(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [selectedStandId, setSelectedStandId] = useState<number | null>(
    () => resumeSession?.standId ?? null,
  );
  const [selectedPortId, setSelectedPortId] = useState<number | null>(
    () => resumeSession?.portId ?? null,
  );
  const [evChargeStep, setEvChargeStep] = useState<EvChargeStep>(
    () => resumeSession?.step ?? "init",
  );
  const [chargeEndsAt, setChargeEndsAt] = useState<number | null>(
    () => resumeSession?.chargeEndsAt ?? null,
  );
  const [dbSessionId, setDbSessionId] = useState<number | null>(
    () => resumeSession?.dbSessionId ?? null,
  );
  const [hideStationPhoto, setHideStationPhoto] = useState(false);
  const [photoHeader, setPhotoHeader] = useState<EvPhotoHeader | null>(null);
  const [selectedWashTariffKey, setSelectedWashTariffKey] = useState<string | null>(
    null,
  );
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
  const hasStationPhoto =
    Boolean(station.photoUrl) &&
    !stationPhotoFailed &&
    !hideStationPhoto &&
    photoHeader?.mode !== "connect";
  const connectHero = photoHeader?.mode === "connect";
  const setupHeader =
    photoHeader?.mode === "setup" ? photoHeader : null;

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

  const toggleHours = () => {
    setRouteOpen(false);
    setHoursOpen(true);
  };

  const closeRoute = () => setRouteOpen(false);

  const openStand = (standId: number) => {
    setSelectedStandId(standId);
    setSelectedPortId(null);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setHideStationPhoto(false);
    setPhotoHeader(null);
    setRouteOpen(false);
    setHoursOpen(false);
  };

  const closeStand = () => {
    setSelectedStandId(null);
    setSelectedPortId(null);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setHideStationPhoto(false);
    setPhotoHeader(null);
    setRouteOpen(false);
    setHoursOpen(false);
  };

  const openFreePort = (port: StationConnectorPort) => {
    if (port.status !== "free") return;
    setSelectedPortId(port.id);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setHideStationPhoto(false);
    setPhotoHeader(null);
    setRouteOpen(false);
    setHoursOpen(false);
  };

  const closePortFlow = () => {
    setSelectedPortId(null);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setHideStationPhoto(false);
    setPhotoHeader(null);
  };

  const closeHours = () => setHoursOpen(false);

  const isLiveStep =
    evChargeStep === "charging" || evChargeStep === "charged_ok";

  const dismissAll = () => {
    if (isLiveStep && onMinimize) {
      onMinimize();
      return;
    }
    onLiveSessionChange?.(null);
    setHoursOpen(false);
    setRouteOpen(false);
    setSelectedPortId(null);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setHideStationPhoto(false);
    setPhotoHeader(null);
    onClose();
  };

  useEffect(() => {
    if (resumeSession) return;
    setSelectedStandId(null);
    setSelectedPortId(null);
    setEvChargeStep("init");
    setChargeEndsAt(null);
    setRouteOpen(false);
    setHoursOpen(false);
    setSelectedWashTariffKey(null);
  }, [initialStation.id, resumeSession]);

  useEffect(() => {
    if (!onLiveSessionChange) return;
    if (!isLiveStep || selectedStandId == null || selectedPortId == null) {
      return;
    }
    if (dbSessionId == null) return;
    onLiveSessionChange({
      kind: "charging",
      dbSessionId,
      stationId: String(station.id),
      stationName: station.name,
      address: station.address || station.name,
      standId: selectedStandId,
      portId: selectedPortId,
      step: evChargeStep,
      chargeEndsAt: evChargeStep === "charging" ? chargeEndsAt : null,
    });
  }, [
    onLiveSessionChange,
    isLiveStep,
    selectedStandId,
    selectedPortId,
    evChargeStep,
    chargeEndsAt,
    dbSessionId,
    station.id,
    station.name,
    station.address,
  ]);

  // Зарядка / готово к оплате — на /details-charging/{sessionId}
  useEffect(() => {
    if (!isLiveStep || dbSessionId == null) {
      if (!isLiveStep) navigatedToDetailsRef.current = false;
      return;
    }
    if (resumeSession) return;
    if (navigatedToDetailsRef.current) return;
    navigatedToDetailsRef.current = true;
    router.push(detailsChargingPath(dbSessionId));
    onMinimize?.();
  }, [isLiveStep, dbSessionId, resumeSession, router, onMinimize]);

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
  const selectedPort =
    selectedStand == null || selectedPortId == null
      ? null
      : (selectedStand.ports.find((p) => p.id === selectedPortId) ?? null);

  useEffect(() => {
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
    // Высота sheet фиксирована — следим только за resize окна, не за сменой панели
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.documentElement.classList.remove("map-sheet-photo-on");
      document.documentElement.style.removeProperty("--map-sheet-h");
    };
  }, [initialStation.id, hasStationPhoto]);

  return (
    <>
      {/* Затемнение без закрытия — закрытие только по X / «Назад» */}
      <div className="map-drawer__backdrop" aria-hidden />

      <div
        className={`map-station-photo-layer is-visible${!hasStationPhoto && !connectHero ? " is-placeholder is-ready" : ""}${hasStationPhoto && stationPhotoLoading ? " is-loading" : ""}${hasStationPhoto && stationPhotoReady ? " is-ready" : ""}${connectHero ? " is-connect-hero is-ready" : ""}${isCharging ? " is-charging" : " is-wash"}`}
        aria-busy={hasStationPhoto && stationPhotoLoading}
        aria-hidden={false}
        onClick={(event) => event.stopPropagation()}
      >
        {connectHero ? (
          <div className="map-station-photo-layer__connect" aria-hidden>
            <span className="map-station-photo-layer__connect-disc">
              <svg viewBox="0 0 64 64" fill="none">
                <rect x="22" y="8" width="8" height="14" rx="2" fill="currentColor" opacity="0.9" />
                <rect x="34" y="8" width="8" height="14" rx="2" fill="currentColor" opacity="0.9" />
                <path
                  d="M18 24h28v10c0 8-6.5 14.5-14 14.5S18 42 18 34V24Z"
                  fill="currentColor"
                  opacity="0.95"
                />
                <path
                  d="M30 48.5v7M34 48.5v7"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        ) : hasStationPhoto ? (
          <>
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
          </>
        ) : (
          <div className="map-station-photo-layer__placeholder" aria-hidden>
            <span className="map-station-photo-layer__placeholder-icon">
              {isCharging ? (
                <svg viewBox="7 3 10 18" fill="currentColor">
                  <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
                </svg>
              )}
            </span>
            <span className="map-station-photo-layer__placeholder-label">
              {t("map.no_photo", "Нет фото")}
            </span>
          </div>
        )}
        {!connectHero ? (
          <div className="map-station-photo-layer__title-bar">
            <div className="map-station-photo-layer__title-main">
              <h2
                id="map-station-photo-title"
                className="map-station-photo-layer__title"
              >
                {setupHeader
                  ? setupHeader.title
                  : station.address || station.name}
              </h2>
              {setupHeader ? (
                <div className="map-station-photo-layer__meta">
                  <span className="map-station-photo-layer__meta-item">
                    <span>{setupHeader.meta}</span>
                  </span>
                </div>
              ) : (
                <div className="map-station-photo-layer__meta">
                  <span
                    className="map-station-photo-layer__meta-item"
                    title={station.hoursLabel}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 7v5l3 2" />
                    </svg>
                    <span>{hoursText}</span>
                  </span>
                  {km != null ? (
                    <span className="map-station-photo-layer__meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {formatDistanceLabel(km)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            {!setupHeader ? <StationSheetMarker station={station} /> : null}
          </div>
        ) : null}
      </div>

      <div
        className={`map-station-sheet is-peek has-photo-static${loading ? " is-refreshing" : ""}`}
        role="dialog"
        aria-labelledby={
          hoursOpen || routeOpen
            ? undefined
            : selectedStand
              ? "map-station-sheet-title"
              : "map-station-photo-title"
        }
        aria-label={
          hoursOpen
            ? t("map.hours_schedule", "График работы")
            : routeOpen
              ? t("map.build_route", "Проложить маршрут")
              : undefined
        }
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
            <BackButton
              className="map-station-sheet__back"
              onClick={
                hoursOpen
                  ? closeHours
                  : routeOpen
                    ? closeRoute
                    : selectedPort
                      ? isLiveStep
                        ? dismissAll
                        : closePortFlow
                      : selectedStand
                        ? closeStand
                        : dismissAll
              }
            />
            <div className="map-station-sheet__toolbar-spacer" aria-hidden />
          </div>
          {!hoursOpen && !routeOpen ? (
            <div className="map-station-sheet__toolbar-actions">
              {!selectedStand && !selectedPort ? (
                <>
                  <HoursButton onClick={toggleHours} active={hoursOpen} />
                  <RouteButton onClick={toggleRoute} active={routeOpen} />
                </>
              ) : null}
              {!selectedPort ? <ScanQrButton /> : null}
            </div>
          ) : null}
          <SheetCloseButton onClick={dismissAll} />
        </div>

        {bootLoading ? (
          <DrawerLoading label={t("map.loading_station", "Загружаем данные…")} />
        ) : stationError && !freshStation ? (
          <div className="map-station-sheet__body map-station-sheet__loading-panel">
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
        ) : selectedStand && selectedPort ? (
          <div className="map-station-sheet__body" {...scrollProps}>
            <EvChargeFlow
              port={selectedPort}
              stand={selectedStand}
              station={station}
              step={evChargeStep}
              onStepChange={setEvChargeStep}
              onRestartInit={() => {
                setChargeEndsAt(null);
                setDbSessionId(null);
                setEvChargeStep("init");
              }}
              onHidePhoto={setHideStationPhoto}
              onPhotoHeader={setPhotoHeader}
              chargeEndsAt={chargeEndsAt}
              onChargeEndsAt={setChargeEndsAt}
              onPayNavigate={onPayNavigate}
              dbSessionId={dbSessionId}
              onDbSessionId={setDbSessionId}
            />
          </div>
        ) : selectedStand ? (
          <div className="map-station-sheet__body" {...scrollProps}>
            <div className="map-conn-step__stand-head">
              <h2 id="map-station-sheet-title" className="map-conn-step__title">
                <MetaIcons
                  pricePerKwh={selectedStand.pricePerKwh}
                  powerKw={selectedStand.powerKw}
                />
              </h2>
              <p className="map-conn-step__parent">{selectedStand.title}</p>
            </div>

            <div className="map-conn-step__list">
              {selectedStand.ports.length === 0 ? (
                <p className="map-stand__empty">
                  {t("map.no_connectors", "Нет коннекторов на этой станции")}
                </p>
              ) : (
                selectedStand.ports.map((port) => (
                  <ConnectorInfoCard
                    key={port.id}
                    port={port}
                    onSelect={openFreePort}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="map-station-sheet__body map-station-sheet__body--compact" {...scrollProps}>
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
                  {t("map.station_section", "Станция")}
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
                <div
                  className="map-station-sheet__tariff-list"
                  role="radiogroup"
                  aria-label={t("payment.tariffs", "Тарифы")}
                >
                  {washTariffs.map((tariff) => {
                    const key =
                      tariff.id != null ? String(tariff.id) : tariff.title;
                    const selected = selectedWashTariffKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`map-station-sheet__tariff${selected ? " is-on" : ""}`}
                        onClick={() => setSelectedWashTariffKey(key)}
                      >
                        <span
                          className={`theme-radio map-station-sheet__tariff-radio${selected ? " is-on" : ""}`}
                          aria-hidden
                        >
                          {selected ? (
                            <span className="map-station-sheet__tariff-radio-dot" />
                          ) : null}
                        </span>
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
                      </button>
                    );
                  })}
                </div>
                {selectedWashTariffKey ? (
                  <button
                    type="button"
                    className="map-station-sheet__btn map-station-sheet__btn--pay map-station-sheet__pay-after"
                    onClick={() => {
                      onPayNavigate?.();
                      router.push(
                        getPaymentPath(station, selectedWashTariffKey),
                      );
                    }}
                  >
                    {t("ev.pay", "Оплатить")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
