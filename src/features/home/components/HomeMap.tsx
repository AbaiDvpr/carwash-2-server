"use client";
import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Station } from "@/data/stations";
import { useCwStations } from "@/hooks/useCwStations";
import { open2GisMap, openYandexMap } from "@/lib/mapController";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";

type StationDotProps = {
  station: Station;
  onSelect: (station: Station) => void;
};

type MapStatus = "loading" | "ready" | "error";

const MAP_CENTER = {
  longitude: 76.889709,
  latitude: 43.238949,
  zoom: 11,
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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
  return (
    <button
      type="button"
      className="map-marker__dot"
      onClick={() => onSelect(station)}
      aria-label={station.name}
    />
  );
}

async function createMapView() {
  const { default: MapGL, Marker } = await import("react-map-gl/maplibre");
  type MapViewProps = {
    stations: Station[];
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
  };
  return function MapView({ stations, selectedStation, onSelectStation }: MapViewProps) {
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
      const first = stations[0];
      mapRef.current.flyTo({
        center: [first.longitude, first.latitude],
        zoom: 11,
        duration: 600,
      });
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
              longitude={station.longitude}
              latitude={station.latitude}
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

export default function HomeMap() {
  const { stations, loading, error } = useCwStations();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  return (
    <>
      <div className="map-page__frame">
        {loading ? (
          <MapLoading />
        ) : error ? (
          <div className="map-error">
            <p className="map-error__title">Не удалось загрузить мойки</p>
            <p className="map-error__text">{error}</p>
          </div>
        ) : (
          <MapView
            stations={stations}
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
                <span className="map-drawer__label">Автомойка</span>
                <h2 id="map-drawer-title" className="map-drawer__title">
                  {selectedStation.name}
                </h2>
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
