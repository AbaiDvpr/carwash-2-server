"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  DEFAULT_MARKER_STYLE_PREFS,
  clampMarkerShapeId,
  markerColorStyle,
  markerStyleClass,
  type KindMarkerPrefs,
  type MapMarkerStylePrefs,
} from "@/features/map/markerStyles";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";

type StationDotProps = {
  station: Station;
  onSelect: (station: Station) => void;
  washPrefs?: KindMarkerPrefs;
  chargingPrefs?: KindMarkerPrefs;
};

type MapStatus = "loading" | "ready" | "error";

type HomeMapProps = {
  stations: Station[];
  loading: boolean;
  error: string | null;
  focusStationId?: string | null;
  onFocusConsumed?: () => void;
  /** Открыть список точек снизу */
  onOpenList: () => void;
  markerPrefs?: MapMarkerStylePrefs;
};

type StationPointProps = {
  stationId: string;
  kind: StationKind;
  /** Кол-во станций/постов на этой точке */
  stationsCount: number;
  wash: number;
  charging: number;
};

type StationClusterProps = {
  wash: number;
  charging: number;
  stationsCount: number;
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

/** Радиус разнесения в пикселях — с запасом под тап, ещё шире при сильном зуме */
function spiderRadiusPx(total: number, zoom = CLUSTER_MAX_ZOOM): number {
  if (total <= 1) return 0;
  // Чем сильнее приблизили — тем дальше разводим (чтобы не жались)
  const zoomBoost = Math.max(0, zoom - (CLUSTER_MAX_ZOOM - 0.5)) * 22;
  if (total === 2) return 62 + zoomBoost;
  if (total === 3) return 70 + zoomBoost;
  return Math.min(78 + (total - 4) * 12 + zoomBoost, 160);
}

function spiderAngle(index: number, total: number): number {
  if (total === 2) return index === 0 ? Math.PI : 0; // влево / вправо
  return (2 * Math.PI * index) / total - Math.PI / 2;
}

/**
 * Смещает точки в экранных пикселях (project/unproject),
 * чтобы на любом зуме расстояние между пинами не схлопывалось.
 */
function spiderfyOffset(
  longitude: number,
  latitude: number,
  index: number,
  total: number,
  zoom: number,
  map: MapRef | null,
): { longitude: number; latitude: number } {
  if (total <= 1) return { longitude, latitude };

  const radiusPx = spiderRadiusPx(total, zoom);
  const angle = spiderAngle(index, total);

  if (map) {
    const center = map.project([longitude, latitude]);
    const point = map.unproject([
      center.x + radiusPx * Math.cos(angle),
      center.y + radiusPx * Math.sin(angle),
    ]);
    return { longitude: point.lng, latitude: point.lat };
  }

  // fallback без map (до onLoad)
  const latRad = (latitude * Math.PI) / 180;
  const metersPerPx =
    (156543.03392 * Math.cos(latRad)) / 2 ** Math.max(zoom, 1);
  const dxM = Math.cos(angle) * radiusPx * metersPerPx;
  const dyM = Math.sin(angle) * radiusPx * metersPerPx;
  const dLng = dxM / (111320 * Math.max(Math.cos(latRad), 0.01));
  const dLat = -dyM / 110540;

  return {
    longitude: longitude + dLng,
    latitude: latitude + dLat,
  };
}

/** Группирует точки, которые на экране накладываются (одна ячейка пикселей). */
function groupOverlappingStations(
  items: { station: Station; longitude: number; latitude: number }[],
  map: MapRef | null,
): { longitude: number; latitude: number; stations: Station[] }[] {
  const groups = new Map<
    string,
    { longitude: number; latitude: number; stations: Station[]; n: number }
  >();

  for (const item of items) {
    let key: string;
    if (map) {
      const p = map.project([item.longitude, item.latitude]);
      // ~половина диаметра пина — всё что ближе, считаем наложением
      const cell = 36;
      key = `${Math.round(p.x / cell)}:${Math.round(p.y / cell)}`;
    } else {
      key = `${item.longitude.toFixed(5)}:${item.latitude.toFixed(5)}`;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.stations.push(item.station);
      existing.longitude =
        (existing.longitude * existing.n + item.longitude) / (existing.n + 1);
      existing.latitude =
        (existing.latitude * existing.n + item.latitude) / (existing.n + 1);
      existing.n += 1;
    } else {
      groups.set(key, {
        longitude: item.longitude,
        latitude: item.latitude,
        stations: [item.station],
        n: 1,
      });
    }
  }

  return [...groups.values()].map((group) => ({
    longitude: group.longitude,
    latitude: group.latitude,
    stations: sortClusterStations(group.stations),
  }));
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

/** Сплошная капля — заливается целиком, не только контур */
function WashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function EvIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="7 3 10 18" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
    </svg>
  );
}

function StationDot({
  station,
  onSelect,
  washPrefs,
  chargingPrefs,
}: StationDotProps) {
  const isCharging = station.kind === "charging";
  const prefs = isCharging ? chargingPrefs : washPrefs;
  const shapeId = clampMarkerShapeId(prefs?.shapeId ?? 1);
  const count = Math.max(
    1,
    station.stationsCount ??
      (isCharging
        ? (station.chargerStands?.length ?? 1)
        : station.washersTotal || 1),
  );
  const free = Math.max(0, station.freeSlots);
  const total = Math.max(station.washersTotal || count, 1);
  const freeRatio = Math.min(1, Math.max(0, free / total));

  return (
    <button
      type="button"
      className={markerStyleClass(isCharging ? "charging" : "wash", shapeId)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(station);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${station.name}: ${free} из ${total} свободно`}
      title={`${free}/${total}`}
      style={
        {
          "--map-marker-free": String(freeRatio),
          ...(prefs ? markerColorStyle(prefs) : null),
        } as CSSProperties
      }
    >
      <span className="map-marker__progress" aria-hidden />
      <span className="map-marker__face">
        <span className="map-marker__icon" aria-hidden>
          {isCharging ? (
            <EvIcon className="map-marker__icon-svg" />
          ) : (
            <WashIcon className="map-marker__icon-svg" />
          )}
        </span>
        <span className="map-marker__count">
          {free}/{total}
        </span>
      </span>
      <span className="map-marker__tip" aria-hidden />
    </button>
  );
}

function SpiderLegs({ count, zoom }: { count: number; zoom: number }) {
  const radius = spiderRadiusPx(count, zoom);
  const size = radius * 2 + 16;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      className="map-marker__spider-legs"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => {
        const angle = spiderAngle(index, count);
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return (
          <line
            key={index}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="map-marker__spider-leg"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={3.5} className="map-marker__spider-hub" />
    </svg>
  );
}

function stationPinCount(station: Station): number {
  if (station.stationsCount != null && station.stationsCount > 0) {
    return station.stationsCount;
  }
  if (station.kind === "charging") {
    return Math.max(1, station.chargerStands?.length ?? 1);
  }
  return Math.max(1, station.washersTotal || 1);
}

function ZoomClusterBubble({
  stationsTotal,
  wash,
  charging,
  locationsCount,
  onExpand,
}: {
  stationsTotal: number;
  wash: number;
  charging: number;
  locationsCount: number;
  onExpand: () => void;
}) {
  const mixed = wash > 0 && charging > 0;
  const kindClass = mixed
    ? "map-cluster--mixed"
    : wash > 0
      ? "map-cluster--wash"
      : "map-cluster--charging";

  return (
    <button
      type="button"
      className={`map-cluster ${kindClass}`}
      onClick={(event) => {
        event.stopPropagation();
        onExpand();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={
        mixed
          ? `Мойки ${wash}, зарядки ${charging} · ${locationsCount} точек — приблизить`
          : `${stationsTotal} станций · ${locationsCount} точек — приблизить`
      }
    >
      {mixed ? (
        <>
          <span className="map-cluster__half map-cluster__half--wash">
            <WashIcon className="map-cluster__icon" />
            <span className="map-cluster__num">{wash}</span>
          </span>
          <span className="map-cluster__half map-cluster__half--charging">
            <EvIcon className="map-cluster__icon map-cluster__icon--ev" />
            <span className="map-cluster__num">{charging}</span>
          </span>
        </>
      ) : (
        <span className="map-cluster__solo">
          {wash > 0 ? (
            <WashIcon className="map-cluster__icon" />
          ) : (
            <EvIcon className="map-cluster__icon map-cluster__icon--ev" />
          )}
          <span className="map-cluster__num">{stationsTotal}</span>
        </span>
      )}
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
    washPrefs: KindMarkerPrefs;
    chargingPrefs: KindMarkerPrefs;
  };
  return function MapView({
    stations,
    cityCenter,
    focusStation,
    onSelectStation,
    washPrefs,
    chargingPrefs,
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
          wash: props.wash,
          charging: props.charging,
          stationsCount: props.stationsCount,
        }),
        reduce: (accumulated, props) => {
          accumulated.wash += props.wash;
          accumulated.charging += props.charging;
          accumulated.stationsCount += props.stationsCount;
        },
      });

      index.load(
        stations.map((station) => {
          const stationsCount = stationPinCount(station);
          return {
            type: "Feature" as const,
            properties: {
              stationId: station.id,
              kind: station.kind,
              stationsCount,
              wash: station.kind === "wash" ? stationsCount : 0,
              charging: station.kind === "charging" ? stationsCount : 0,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [station.longitude, station.latitude],
            },
          };
        }),
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

    /**
     * На высоком зуме Supercluster отдаёт совпадающие точки по отдельности —
     * без группировки они снова накладываются. Собираем листья и spiderfy.
     */
    const highZoomPins = useMemo(() => {
      if (zoom < CLUSTER_MAX_ZOOM - 0.2 || !bounds) return null;

      const items: { station: Station; longitude: number; latitude: number }[] =
        [];
      const seen = new Set<string>();

      for (const feature of visibleClusters) {
        const props = feature.properties as Record<string, unknown>;
        if (props.cluster) {
          const leaves = clusterIndex.getLeaves(Number(props.cluster_id), Infinity);
          for (const leaf of leaves) {
            const station = stationsById.get(String(leaf.properties.stationId));
            if (!station || seen.has(station.id)) continue;
            seen.add(station.id);
            items.push({
              station,
              longitude: station.longitude,
              latitude: station.latitude,
            });
          }
          continue;
        }

        const station = stationsById.get(String(props.stationId));
        if (!station || seen.has(station.id)) continue;
        seen.add(station.id);
        items.push({
          station,
          longitude: station.longitude,
          latitude: station.latitude,
        });
      }

      return groupOverlappingStations(items, mapRef.current);
    }, [bounds, clusterIndex, stationsById, visibleClusters, zoom]);

    const expandCluster = useCallback(
      (clusterId: number, longitude: number, latitude: number) => {
        const map = mapRef.current;
        if (!map) return;

        const expansionZoom = Math.min(
          clusterIndex.getClusterExpansionZoom(clusterId),
          18,
        );
        const currentZoom = map.getZoom();

        // Дальше разгруппировать нельзя — доводим до max zoom, там пины разъедутся
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
          {highZoomPins
            ? highZoomPins.flatMap((group, groupIndex) => {
                if (group.stations.length === 1) {
                  const station = group.stations[0]!;
                  return [
                    <Marker
                      key={`pin-${station.id}`}
                      longitude={group.longitude}
                      latitude={group.latitude}
                      anchor="bottom"
                    >
                      <StationDot
                        station={station}
                        onSelect={onSelectStation}
                        washPrefs={washPrefs}
                        chargingPrefs={chargingPrefs}
                      />
                    </Marker>,
                  ];
                }

                return [
                  <Marker
                    key={`spider-hub-${groupIndex}`}
                    longitude={group.longitude}
                    latitude={group.latitude}
                    anchor="center"
                  >
                    <SpiderLegs count={group.stations.length} zoom={zoom} />
                  </Marker>,
                  ...group.stations.map((station, index) => {
                    const pos = spiderfyOffset(
                      group.longitude,
                      group.latitude,
                      index,
                      group.stations.length,
                      zoom,
                      mapRef.current,
                    );
                    return (
                      <Marker
                        key={`spider-${groupIndex}-${station.id}`}
                        longitude={pos.longitude}
                        latitude={pos.latitude}
                        anchor="bottom"
                      >
                        <StationDot
                        station={station}
                        onSelect={onSelectStation}
                        washPrefs={washPrefs}
                        chargingPrefs={chargingPrefs}
                      />
                      </Marker>
                    );
                  }),
                ];
              })
            : visibleClusters.flatMap((feature) => {
                const [longitude, latitude] = feature.geometry.coordinates;
                const props = feature.properties as Record<string, unknown>;
                const isCluster = Boolean(props.cluster);

                if (isCluster) {
                  const clusterId = Number(props.cluster_id);
                  const locationsCount = Number(props.point_count ?? 0);
                  const wash = Number(props.wash ?? 0);
                  const charging = Number(props.charging ?? 0);
                  const stationsTotal = Math.max(
                    1,
                    Number(props.stationsCount ?? wash + charging),
                  );

                  return [
                    <Marker
                      key={`cluster-${clusterId}`}
                      longitude={longitude}
                      latitude={latitude}
                      anchor="center"
                    >
                      <ZoomClusterBubble
                        stationsTotal={stationsTotal}
                        wash={wash}
                        charging={charging}
                        locationsCount={locationsCount}
                        onExpand={() =>
                          expandCluster(clusterId, longitude, latitude)
                        }
                      />

                  
                    </Marker>,
                  ];
                }

                const station = stationsById.get(String(props.stationId));
                if (!station) return [];

                return [
                  <Marker
                    key={`station-${station.id}`}
                    longitude={longitude}
                    latitude={latitude}
                    anchor="bottom"
                  >
                    <StationDot
                      station={station}
                      onSelect={onSelectStation}
                      washPrefs={washPrefs}
                      chargingPrefs={chargingPrefs}
                    />
                  </Marker>,
                ];
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
  onOpenList,
  markerPrefs = DEFAULT_MARKER_STYLE_PREFS,
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
                key={`${mapGeoId ?? "all"}-${markerPrefs.wash.shapeId}-${markerPrefs.charging.shapeId}`}
                stations={stations}
                cityCenter={cityCenter}
                focusStation={focusStation}
                selectedStation={selectedStation}
                washPrefs={markerPrefs.wash}
                chargingPrefs={markerPrefs.charging}
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
