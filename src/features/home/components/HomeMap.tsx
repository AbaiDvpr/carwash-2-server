"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MapRef } from "react-map-gl/maplibre";
import dynamic from "next/dynamic";
import Supercluster from "supercluster";
import type { Station, StationKind } from "@/data/stations";
import Toast from "@/components/ui/Toast";
import StationMapDrawer from "@/features/home/components/StationMapDrawer";
import { useToast } from "@/hooks/useToast";
import { useT } from "@/hooks/useT";
import { useUserCity } from "@/hooks/useUserCity";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  findNearestCity,
  getCityMapCenter,
  type MapCenter,
} from "@/lib/api/geos";
import { getCachedUserLocation, getUserLocation, subscribeUserLocation } from "@/lib/locationController";
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

type StationPointProps = {
  stationId: string;
  kind: StationKind;
  wash: number;
  charging: number;
};

type StationClusterProps = {
  wash: number;
  charging: number;
};

type LngLatBoundsLike = [number, number, number, number];

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const CLUSTER_RADIUS_PX = 56;
const CLUSTER_MAX_ZOOM = 17;

/** Мойка (синий) слева, ЭЗС (зелёный) справа — удобно различать наслоение */
function sortClusterStations(stations: Station[]): Station[] {
  return [...stations].sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name, "ru");
    return a.kind === "wash" ? -1 : 1;
  });
}


function MapLoading() {
  const t = useT();
  return (
    <div className="map-loading">
      <div className="map-loading__spinner" />
      <p className="map-loading__text">{t("map.loading", "Загрузка карты…")}</p>
    </div>
  );
}

function MapError() {
  const t = useT();
  return (
    <div className="map-error">
      <p className="map-error__title">{t("map.unavailable", "Карта недоступна")}</p>
      <p className="map-error__text">
        {t("map.check_internet", "Проверьте интернет и обновите страницу")}
      </p>
    </div>
  );
}

function WashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 792 792" fill="currentColor" aria-hidden>
      <path d="M665.335,486.777c-7.815-46.161-25.534-88.323-43.162-126.578C569.197,243.434,505.408,137.391,442.619,39.255 l-7.815-13.721C423.991,8.814,411.269,0,396.549,0c-21.626,0-35.347,19.627-39.255,25.534c0,0,0,0,0,1L343.573,48.16 c-24.534,39.255-50.068,80.508-74.602,121.671C230.716,234.62,182.647,320.944,147.3,413.174 c-11.813,30.441-22.535,60.881-23.535,94.229c-3.907,86.324,27.442,159.018,92.23,215.901C266.063,767.466,329.852,792,395.549,792 l0,0c96.138,0,183.552-49.068,233.529-132.485C662.427,604.541,675.148,545.659,665.335,486.777z M597.638,640.888 c-43.162,72.603-118.764,114.765-202.18,114.765c-56.883,0-112.857-20.627-156.019-58.882 c-55.974-49.068-83.416-112.857-80.508-187.459c1-27.442,9.814-53.975,21.626-82.417c34.348-90.322,81.417-174.647,118.764-238.436 c23.535-40.254,49.068-81.417,74.602-120.672l12.721-20.627c0-1,1-1,1-1.999c1.999-2.908,5.906-7.815,7.815-8.814 c0,0,2.908,1,7.815,8.814l7.815,12.721c60.881,96.138,124.67,201.18,176.646,316.037c16.72,37.256,33.348,76.51,40.254,117.764 C637.893,542.751,627.079,592.728,597.638,640.888z M413.087,662.423c0,9.814-7.815,17.628-17.628,17.628 c-89.323,0-160.926-72.603-160.926-160.926c0-9.814,7.815-17.628,17.628-17.628c9.814,0,17.628,7.815,17.628,17.628 c0.999,68.696,56.974,124.67,125.669,124.67C405.272,643.795,413.087,652.609,413.087,662.423z" />
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
  const t = useT();
  const [chooserOpen, setChooserOpen] = useState(false);

  if (stations.length === 1) {
    return <StationDot station={stations[0]!} onSelect={onSelect} />;
  }

  if (chooserOpen) {
    return (
      <div
        className="map-marker__chooser"
        role="listbox"
        aria-label={t("map.points", "Точки на карте")}
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
              {isCharging ? t("common.charging", "ЭЗС") : t("common.wash", "Мойка")}
            </button>
          );
        })}
        <button
          type="button"
          className="map-marker__chooser-close"
          aria-label={t("common.close", "Закрыть")}
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
      {stations.length > 3 ? (
        <span className="map-marker__bundle-more">+{stations.length - 3}</span>
      ) : null}
    </button>
  );
}

function ZoomClusterBubble({
  count,
  wash,
  charging,
  onExpand,
}: {
  count: number;
  wash: number;
  charging: number;
  onExpand: () => void;
}) {
  const mixed = wash > 0 && charging > 0;

  return (
    <button
      type="button"
      className="map-cluster"
      onClick={(event) => {
        event.stopPropagation();
        onExpand();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${count} точек — приблизить`}
    >
      {wash > 0 ? (
        <span className="map-cluster__item map-cluster__item--wash">
          <WashIcon className="map-cluster__icon" />
          <span className="map-cluster__num">{wash}</span>
        </span>
      ) : null}
      {mixed ? <span className="map-cluster__divider" aria-hidden /> : null}
      {charging > 0 ? (
        <span className="map-cluster__item map-cluster__item--charging">
          <EvIcon className="map-cluster__icon" />
          <span className="map-cluster__num">{charging}</span>
        </span>
      ) : null}
    </button>
  );
}

async function createMapView() {
  const { default: MapGL, Marker } = await import("react-map-gl/maplibre");
  type MapViewProps = {
    stations: Station[];
    cityCenter: MapCenter;
    focusStation: Station | null;
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
  };
  return function MapView({
    stations,
    cityCenter,
    focusStation,
    onSelectStation,
  }: MapViewProps) {
    const [status, setStatus] = useState<MapStatus>("loading");
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(() => getCachedUserLocation());
    const [zoom, setZoom] = useState(cityCenter.zoom);
    const [bounds, setBounds] = useState<LngLatBoundsLike | null>(null);
    const { message: toastMessage, showToast } = useToast();
    const t = useT();
    const focusedOnce = useRef<string | null>(null);
    const mapRef = useRef<MapRef>(null);

    const stationsById = useMemo(
      () => new Map(stations.map((station) => [station.id, station])),
      [stations],
    );

    const clusterIndex = useMemo(() => {
      const index = new Supercluster<StationPointProps, StationClusterProps>({
        radius: CLUSTER_RADIUS_PX,
        maxZoom: CLUSTER_MAX_ZOOM,
        minPoints: 2,
        map: (props) => ({
          wash: props.kind === "wash" ? 1 : 0,
          charging: props.kind === "charging" ? 1 : 0,
        }),
        reduce: (accumulated, props) => {
          accumulated.wash += props.wash;
          accumulated.charging += props.charging;
        },
      });

      index.load(
        stations.map((station) => ({
          type: "Feature" as const,
          properties: {
            stationId: station.id,
            kind: station.kind,
            wash: station.kind === "wash" ? 1 : 0,
            charging: station.kind === "charging" ? 1 : 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [station.longitude, station.latitude],
          },
        })),
      );

      return index;
    }, [stations]);

    const viewportRaf = useRef<number | null>(null);
    const syncViewport = useCallback(() => {
      if (viewportRaf.current != null) return;
      viewportRaf.current = requestAnimationFrame(() => {
        viewportRaf.current = null;
        const map = mapRef.current;
        if (!map) return;
        const nextBounds = map.getBounds();
        if (!nextBounds) return;
        const west = nextBounds.getWest();
        const south = nextBounds.getSouth();
        const east = nextBounds.getEast();
        const north = nextBounds.getNorth();
        const padLng = Math.max((east - west) * 0.12, 0.01);
        const padLat = Math.max((north - south) * 0.12, 0.01);
        setZoom(map.getZoom());
        setBounds([west - padLng, south - padLat, east + padLng, north + padLat]);
      });
    }, []);

    const visibleClusters = useMemo(() => {
      if (!bounds) return [];
      return clusterIndex.getClusters(bounds, Math.round(zoom));
    }, [bounds, clusterIndex, zoom]);

    const expandCluster = useCallback(
      (clusterId: number, longitude: number, latitude: number) => {
        const map = mapRef.current;
        if (!map) return;

        const expansionZoom = Math.min(
          clusterIndex.getClusterExpansionZoom(clusterId),
          18,
        );
        const currentZoom = map.getZoom();

        // Дальше разгруппировать нельзя — доводим до max zoom, там откроется бандл/выбор
        if (expansionZoom <= currentZoom + 0.15) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: Math.max(currentZoom, CLUSTER_MAX_ZOOM),
            duration: 350,
          });
          return;
        }

        map.flyTo({
          center: [longitude, latitude],
          zoom: expansionZoom,
          duration: 500,
        });
      },
      [clusterIndex],
    );

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
        showToast(t("map.geo_permission", "Пожалуйста, дайте доступ к геолокации"));
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
          onLoad={() => {
            setStatus("ready");
            // после layout bounds уже валидны
            requestAnimationFrame(syncViewport);
          }}
          onError={() => setStatus("error")}
          onMove={syncViewport}
        >
          {visibleClusters.map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;
            const props = feature.properties as Record<string, unknown>;
            const isCluster = Boolean(props.cluster);

            if (isCluster) {
              const clusterId = Number(props.cluster_id);
              const count = Number(props.point_count ?? 0);
              const wash = Number(props.wash ?? 0);
              const charging = Number(props.charging ?? 0);

              // На максимальном зуме кластер = точки почти в одной координате
              if (zoom >= CLUSTER_MAX_ZOOM - 0.2) {
                const leaves = clusterIndex.getLeaves(clusterId, Infinity);
                const leafStations = sortClusterStations(
                  leaves
                    .map((leaf) => stationsById.get(String(leaf.properties.stationId)))
                    .filter((station): station is Station => Boolean(station)),
                );
                if (leafStations.length > 0) {
                  return (
                    <Marker
                      key={`cluster-leaves-${clusterId}`}
                      longitude={longitude}
                      latitude={latitude}
                      anchor="bottom"
                    >
                      <ClusterMarker stations={leafStations} onSelect={onSelectStation} />
                    </Marker>
                  );
                }
              }

              return (
                <Marker
                  key={`cluster-${clusterId}`}
                  longitude={longitude}
                  latitude={latitude}
                  anchor="center"
                >
                  <ZoomClusterBubble
                    count={count}
                    wash={wash}
                    charging={charging}
                    onExpand={() => expandCluster(clusterId, longitude, latitude)}
                  />
                </Marker>
              );
            }

            const station = stationsById.get(String(props.stationId));
            if (!station) return null;

            return (
              <Marker
                key={`station-${station.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="bottom"
              >
                <ClusterMarker stations={[station]} onSelect={onSelectStation} />
              </Marker>
            );
          })}

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
  const t = useT();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [portalReady, setPortalReady] = useState(false);
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
            <div className="map-top-actions">
              <button
                type="button"
                onClick={onOpenList}
                className="map-list-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <span>{t("map.list", "Список")}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="map-close-btn"
                aria-label={t("common.close", "Закрыть")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {loading || locationLoading ? (
              <div className="map-loading">
                <div className="map-loading__spinner" aria-hidden />
                <p className="map-loading__text">
                  {locationLoading
                    ? t("map.locating", "Определяем геолокацию…")
                    : t("map.loading", "Загрузка карты…")}
                </p>
              </div>
            ) : error ? (
              <div className="map-error">
                <p className="map-error__title">
                  {t("map.load_error", "Не удалось загрузить точки")}
                </p>
                <p className="map-error__text">{error}</p>
              </div>
            ) : (
              <MapView
                key={mapGeoId ?? "all"}
                stations={stations}
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
          <StationMapDrawer
            station={selectedStation}
            userLocation={userLocation}
            onClose={() => {
              setSelectedStation(null);
              onFocusConsumed?.();
            }}
          />,
          document.body,
        )}
    </>
  );
}
