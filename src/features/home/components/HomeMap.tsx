"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MapRef } from "react-map-gl/maplibre";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Station } from "@/data/stations";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useUserCity } from "@/hooks/useUserCity";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  findNearestCity,
  getCityMapCenter,
  type MapCenter,
} from "@/lib/api/geos";
import { getCachedUserLocation, getUserLocation, subscribeUserLocation } from "@/lib/locationController";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";

type StationDotProps = {
  station: Station;
  onSelect: (station: Station) => void;
};

type MapStatus = "loading" | "ready" | "error";

type HomeMapProps = {
  stations: Station[];
  loading: boolean;
  error: string | null;
  focusStationId?: string | null;
  onFocusConsumed?: () => void;
  /** Закрыть карту (кнопка X) */
  onClose: () => void;
  /** Открыть список точек снизу */
  onOpenList: () => void;
};

type MarkerCluster = {
  key: string;
  latitude: number;
  longitude: number;
  stations: Station[];
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** ~12–15 м: точки в одном месте / рядом группируем */
const CLUSTER_GRID = 0.00012;

function clusterKey(lat: number, lng: number): string {
  return `${(Math.round(lat / CLUSTER_GRID) * CLUSTER_GRID).toFixed(5)}_${(
    Math.round(lng / CLUSTER_GRID) * CLUSTER_GRID
  ).toFixed(5)}`;
}

/** Мойка (синий) слева, ЭЗС (зелёный) справа — удобно различать наслоение */
function sortClusterStations(stations: Station[]): Station[] {
  return [...stations].sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name, "ru");
    return a.kind === "wash" ? -1 : 1;
  });
}

function buildClusters(stations: Station[]): MarkerCluster[] {
  const groups = new Map<string, Station[]>();

  for (const station of stations) {
    const key = clusterKey(station.latitude, station.longitude);
    const list = groups.get(key);
    if (list) list.push(station);
    else groups.set(key, [station]);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const sorted = sortClusterStations(group);
    const latitude =
      sorted.reduce((sum, s) => sum + s.latitude, 0) / sorted.length;
    const longitude =
      sorted.reduce((sum, s) => sum + s.longitude, 0) / sorted.length;
    return { key, latitude, longitude, stations: sorted };
  });
}

function MapLoading() {
  return (
    <div className="map-loading">
      <div className="map-loading__spinner" />
      <p className="map-loading__text">Загрузка карты…</p>
    </div>
  );
}

function MapError() {
  return (
    <div className="map-error">
      <p className="map-error__title">Карта недоступна</p>
      <p className="map-error__text">Проверьте интернет и обновите страницу</p>
    </div>
  );
}

function WashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
      />
    </svg>
  );
}

function EvIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
    </svg>
  );
}

function StationDot({ station, onSelect }: StationDotProps) {
  const isCharging = station.kind === "charging";
  return (
    <button
      type="button"
      className={isCharging ? "map-marker__pin map-marker__pin--charging" : "map-marker__pin"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(station);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={station.name}
      title={station.name}
    >
      <span className="map-marker__pin-face">
        {isCharging ? <EvIcon className="map-marker__pin-icon" /> : <WashIcon className="map-marker__pin-icon" />}
      </span>
      <span className="map-marker__pin-tip" />
    </button>
  );
}

type ClusterMarkerProps = {
  stations: Station[];
  onSelect: (station: Station) => void;
};

/**
 * 1 точка — крупная зона тапа.
 * 2+ в одной координате — бандл: тап → выбор Мойка / ЭЗС (на телефоне так удобнее, чем целиться в нахлёст).
 */
function ClusterMarker({ stations, onSelect }: ClusterMarkerProps) {
  const [chooserOpen, setChooserOpen] = useState(false);

  if (stations.length === 1) {
    return <StationDot station={stations[0]!} onSelect={onSelect} />;
  }

  if (chooserOpen) {
    return (
      <div
        className="map-marker__chooser"
        role="listbox"
        aria-label="Выберите точку"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {stations.map((station) => {
          const isCharging = station.kind === "charging";
          return (
            <button
              key={station.id}
              type="button"
              role="option"
              className={
                isCharging
                  ? "map-marker__chooser-btn map-marker__chooser-btn--charging"
                  : "map-marker__chooser-btn"
              }
              onClick={(event) => {
                event.stopPropagation();
                setChooserOpen(false);
                onSelect(station);
              }}
            >
              {isCharging ? (
                <EvIcon className="map-marker__chooser-icon" />
              ) : (
                <WashIcon className="map-marker__chooser-icon" />
              )}
              {isCharging ? "ЭЗС" : "Мойка"}
            </button>
          );
        })}
        <button
          type="button"
          className="map-marker__chooser-close"
          aria-label="Закрыть"
          onClick={(event) => {
            event.stopPropagation();
            setChooserOpen(false);
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={
        stations.length === 2
          ? "map-marker__bundle map-marker__bundle--pair"
          : "map-marker__bundle map-marker__bundle--stack"
      }
      aria-label={`${stations.length} точек рядом — выбрать`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        setChooserOpen(true);
      }}
    >
      {stations.slice(0, 3).map((station) => (
        <span
          key={station.id}
          className={
            station.kind === "charging"
              ? "map-marker__bundle-pin map-marker__bundle-pin--charging"
              : "map-marker__bundle-pin"
          }
        >
          {station.kind === "charging" ? (
            <EvIcon className="map-marker__pin-icon" />
          ) : (
            <WashIcon className="map-marker__pin-icon" />
          )}
        </span>
      ))}
    </button>
  );
}

async function createMapView() {
  const { default: MapGL, Marker } = await import("react-map-gl/maplibre");
  type MapViewProps = {
    clusters: MarkerCluster[];
    cityCenter: MapCenter;
    focusStation: Station | null;
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
  };
  return function MapView({
    clusters,
    cityCenter,
    focusStation,
    onSelectStation,
  }: MapViewProps) {
    const [status, setStatus] = useState<MapStatus>("loading");
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(() => getCachedUserLocation());
    const { message: toastMessage, showToast } = useToast();
    const focusedOnce = useRef<string | null>(null);

    const mapRef = useRef<MapRef>(null);

    async function handleLocation() {
      try {
        const location = await getUserLocation({ force: true });
        setUserLocation(location);
        mapRef.current?.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 15,
          duration: 900,
        });
      } catch {
        showToast("Пожалуйста, дайте доступ к геолокации");
      }
    }

    useEffect(() => subscribeUserLocation(setUserLocation), []);

    // Открыли «На карте» — летим к точке
    useEffect(() => {
      if (!mapRef.current || status !== "ready" || !focusStation) return;
      if (focusedOnce.current === focusStation.id) return;
      focusedOnce.current = focusStation.id;
      mapRef.current.flyTo({
        center: [focusStation.longitude, focusStation.latitude],
        zoom: 15,
        duration: 900,
      });
    }, [focusStation, status]);

    // Обычное открытие карты — центр города по GPS
    useEffect(() => {
      if (!mapRef.current || status !== "ready") return;
      if (focusStation) return;

      mapRef.current.flyTo({
        center: [cityCenter.longitude, cityCenter.latitude],
        zoom: cityCenter.zoom,
        duration: 700,
      });
    }, [cityCenter, status, focusStation]);

    return (
      <div className="map-root">
        {status === "loading" && <MapLoading />}
        {status === "error" && <MapError />}
        {status === "ready" && (
          <div
            className="map-zoom-controls"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="map-zoom-controls__btn"
              onClick={handleLocation}
              aria-label="Моё местоположение"
              title="Моё местоположение"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
            <div className="map-zoom-controls__stack" role="group" aria-label="Масштаб">
              <button
                type="button"
                className="map-zoom-controls__btn"
                onClick={() => mapRef.current?.zoomIn({ duration: 200 })}
                aria-label="Приблизить"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                className="map-zoom-controls__btn"
                onClick={() => mapRef.current?.zoomOut({ duration: 200 })}
                aria-label="Отдалить"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" d="M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <MapGL
          ref={mapRef}
          initialViewState={cityCenter}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          dragRotate={false}
          touchPitch={false}
          pitchWithRotate={false}
          maxPitch={0}
          attributionControl={false}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
        >
          {clusters.map((cluster) => (
            <Marker
              key={cluster.key}
              longitude={cluster.longitude}
              latitude={cluster.latitude}
              anchor="bottom"
            >
              <ClusterMarker stations={cluster.stations} onSelect={onSelectStation} />
            </Marker>
          ))}

          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <span className="map-user__dot" />
            </Marker>
          )}
        </MapGL>
        <Toast message={toastMessage} />
      </div>
    );
  };
}

const MapView = dynamic(createMapView, {
  ssr: false,
  loading: MapLoading,
});

export default function HomeMap({
  stations,
  loading,
  error,
  focusStationId = null,
  onFocusConsumed,
  onClose,
  onOpenList,
}: HomeMapProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const clusters = useMemo(() => buildClusters(stations), [stations]);
  const { geoId, cities } = useUserCity();
  const { location: userLocation, loading: locationLoading } = useUserLocation();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const focusStation = useMemo(() => {
    if (!focusStationId) return null;
    return stations.find((station) => station.id === focusStationId) ?? null;
  }, [focusStationId, stations]);

  // Центр карты: город по GPS, иначе город из профиля
  const locationCity = useMemo(() => {
    if (!userLocation || cities.length === 0) return null;
    return findNearestCity(
      userLocation.latitude,
      userLocation.longitude,
      cities,
    );
  }, [userLocation, cities]);

  const mapGeoId = locationCity?.id ?? geoId;

  const cityCenter = useMemo(
    () => getCityMapCenter(mapGeoId, cities),
    [mapGeoId, cities],
  );

  useEffect(() => {
    if (!focusStation) return;
    setSelectedStation(focusStation);
  }, [focusStation]);

  return (
    <>
      <div className="map-page">
        <div className="map-page__body">
          <div className="map-page__frame">
            <button
              type="button"
              onClick={onOpenList}
              className="map-list-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              Список
            </button>

            <button
              type="button"
              onClick={onClose}
              className="map-close-btn"
              aria-label="Закрыть карту"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            {loading || locationLoading ? (
              <div className="map-loading">
                <div className="map-loading__spinner" aria-hidden />
                <p className="map-loading__text">
                  {locationLoading ? "Определяем геолокацию…" : "Загрузка карты…"}
                </p>
              </div>
            ) : error ? (
              <div className="map-error">
                <p className="map-error__title">Не удалось загрузить точки</p>
                <p className="map-error__text">{error}</p>
              </div>
            ) : (
              <MapView
                key={mapGeoId ?? "all"}
                clusters={clusters}
                cityCenter={cityCenter}
                focusStation={focusStation}
                selectedStation={selectedStation}
                onSelectStation={(station) => {
                  setSelectedStation(station);
                  if (!station) onFocusConsumed?.();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {portalReady &&
        selectedStation &&
        createPortal(
          <>
            <button
              type="button"
              className="map-drawer__backdrop"
              onClick={() => setSelectedStation(null)}
              aria-label="Закрыть"
            />
            <div className="map-drawer" role="dialog" aria-labelledby="map-drawer-title">
              <div className="map-drawer__handle" aria-hidden />
              <div className="map-drawer__header">
                <div className="map-drawer__headline">
                  <span className="map-drawer__label">
                    {selectedStation.kind === "charging" ? "ЭЗС" : "Автомойка"}
                  </span>
                  <h2 id="map-drawer-title" className="map-drawer__title">
                    {selectedStation.name}
                  </h2>
                  <p className="theme-description mt-1 text-xs">
                    {selectedStation.freeSlots}/{selectedStation.washersTotal} свободно
                  </p>
                </div>
                <button
                  type="button"
                  className="map-drawer__close"
                  onClick={() => setSelectedStation(null)}
                  aria-label="Закрыть"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <p className="map-drawer__route-label">Маршрут</p>
              <div className="map-drawer__actions">
                <a
                  href={selectedStation.map_yandex}
                  onClick={(event) => {
                    event.preventDefault();
                    openYandexMap(
                      selectedStation.latitude,
                      selectedStation.longitude,
                      selectedStation.map_yandex,
                    );
                  }}
                  className="map-drawer__link map-drawer__link--yandex"
                >
                  Яндекс Карты
                </a>
                <a
                  href={selectedStation.map_2gis}
                  onClick={(event) => {
                    event.preventDefault();
                    open2GisMap(
                      selectedStation.latitude,
                      selectedStation.longitude,
                      selectedStation.map_2gis,
                    );
                  }}
                  className="map-drawer__link map-drawer__link--gis"
                >
                  2ГИС
                </a>
              </div>
              <Link
                href={`/station/${selectedStation.id}`}
                className="theme-button mt-3 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition"
              >
                Подробнее
              </Link>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
