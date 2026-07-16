"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Station } from "@/data/stations";
import { getUserLocation } from "@/lib/locationController";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import HomeTabShell from "./HomeTabShell";
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

type MarkerCluster = {
  key: string;
  latitude: number;
  longitude: number;
  stations: Station[];
};

const MAP_CENTER = {
  longitude: 76.889709,
  latitude: 43.238949,
  zoom: 11,
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

function StationDot({ station, onSelect }: StationDotProps) {
  const isCharging = station.kind === "charging";
  return (
    <button
      type="button"
      className={isCharging ? "map-marker__dot map-marker__dot--charging" : "map-marker__dot"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(station);
      }}
      aria-label={station.name}
      title={station.name}
    />
  );
}

type ClusterMarkerProps = {
  stations: Station[];
  onSelect: (station: Station) => void;
};

/** Одна точка или плотный ряд синий+зелёный без большого разъезда */
function ClusterMarker({ stations, onSelect }: ClusterMarkerProps) {
  if (stations.length === 1) {
    return <StationDot station={stations[0]} onSelect={onSelect} />;
  }

  return (
    <div
      className={
        stations.length === 2
          ? "map-marker__cluster map-marker__cluster--pair"
          : "map-marker__cluster map-marker__cluster--stack"
      }
      role="group"
      aria-label={`${stations.length} точек рядом`}
    >
      {stations.map((station) => (
        <StationDot key={station.id} station={station} onSelect={onSelect} />
      ))}
    </div>
  );
}

async function createMapView() {
  const { default: MapGL, Marker } = await import("react-map-gl/maplibre");
  type MapViewProps = {
    clusters: MarkerCluster[];
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
  };
  return function MapView({ clusters, onSelectStation }: MapViewProps) {
    const [status, setStatus] = useState<MapStatus>("loading");
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

    const mapRef = useRef<MapRef>(null);

    async function handleLocation() {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        mapRef.current?.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 15,
          duration: 900,
        });
      } catch {
        alert("Не удалось получить геолокацию");
      }
    }

    useEffect(() => {
      if (!clusters.length || !mapRef.current) return;

      const lats = clusters.map((c) => c.latitude);
      const lngs = clusters.map((c) => c.longitude);
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
    }, [clusters]);

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
          {clusters.map((cluster) => (
            <Marker
              key={cluster.key}
              longitude={cluster.longitude}
              latitude={cluster.latitude}
              anchor="center"
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
  const clusters = useMemo(() => buildClusters(stations), [stations]);

  return (
    <>
      <HomeTabShell
        eyebrow="Карта"
        title="Точки рядом"
        subtitle={
          loading
            ? "Загрузка…"
            : `${stations.length} точек · синие — мойки, зелёные — ЭЗС`
        }
        action={
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
        }
      >
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
              clusters={clusters}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
          )}
        </div>
      </HomeTabShell>

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
    </>
  );
}
