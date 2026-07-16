"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Station } from "@/data/stations";
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
  onBackToList: () => void;
};

type DisplayStation = Station & {
  displayLatitude: number;
  displayLongitude: number;
};

const MAP_CENTER = {
  longitude: 76.889709,
  latitude: 43.238949,
  zoom: 11,
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** ~25–40 м — чтобы мойка и ЭЗС в одном здании не слипались в одну точку */
function withDisplayOffsets(stations: Station[]): DisplayStation[] {
  const used = new Map<string, number>();

  return stations.map((station) => {
    const key = `${station.latitude.toFixed(5)}_${station.longitude.toFixed(5)}`;
    const index = used.get(key) ?? 0;
    used.set(key, index + 1);

    // лёгкий сдвиг по кругу для совпадающих/очень близких точек
    const angle = (index * 120 * Math.PI) / 180;
    const delta = index === 0 ? 0 : 0.00028;
    return {
      ...station,
      displayLatitude: station.latitude + Math.sin(angle) * delta,
      displayLongitude: station.longitude + Math.cos(angle) * delta,
    };
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

function StationDot({ station, onSelect }: StationDotProps) {
  const isCharging = station.kind === "charging";
  return (
    <button
      type="button"
      className={isCharging ? "map-marker__dot map-marker__dot--charging" : "map-marker__dot"}
      onClick={() => onSelect(station)}
      aria-label={station.name}
      title={station.name}
    />
  );
}

async function createMapView() {
  const { default: MapGL, Marker } = await import("react-map-gl/maplibre");
  type MapViewProps = {
    stations: DisplayStation[];
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
  };
  return function MapView({ stations, onSelectStation }: MapViewProps) {
    const [status, setStatus] = useState<MapStatus>("loading");
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

    const mapRef = useRef<MapRef>(null);

    function handleLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(location);
          mapRef.current?.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 15,
            duration: 900,
          });
        },
        () => {
          alert("Не удалось получить геолокацию");
        },
      );
    }

    useEffect(() => {
      if (!stations.length || !mapRef.current) return;

      const lats = stations.map((s) => s.displayLatitude);
      const lngs = stations.map((s) => s.displayLongitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 56, duration: 700, maxZoom: 14 },
      );
    }, [stations]);

    return (
      <div className="map-root">
        {status === "loading" && <MapLoading />}
        {status === "error" && <MapError />}
        {status === "ready" && (
          <div className="map-zoom-controls z-10">
            <button type="button" onClick={handleLocation}>
              location
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomIn()}>
              +
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()}>
              −
            </button>
          </div>
        )}

        <MapGL
          ref={mapRef}
          initialViewState={MAP_CENTER}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          dragRotate={false}
          touchPitch={false}
          pitchWithRotate={false}
          maxPitch={0}
          attributionControl={false}
          reuseMaps
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
        >
          {stations.map((station) => (
            <Marker
              key={station.id}
              longitude={station.displayLongitude}
              latitude={station.displayLatitude}
              anchor="bottom"
            >
              <StationDot station={station} onSelect={onSelectStation} />
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
  onBackToList,
}: HomeMapProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const displayStations = useMemo(() => withDisplayOffsets(stations), [stations]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Карта</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Загрузка…"
              : `${stations.length} точек · синие — мойки, зелёные — ЭЗС`}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Список
        </button>
      </div>

      <div className="map-page__frame">
        {loading ? (
          <MapLoading />
        ) : error ? (
          <div className="map-error">
            <p className="map-error__title">Не удалось загрузить точки</p>
            <p className="map-error__text">{error}</p>
          </div>
        ) : (
          <MapView
            stations={displayStations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
          />
        )}
      </div>

      {selectedStation && (
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
                <p className="mt-1 text-xs text-zinc-500">
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
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Подробнее
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
