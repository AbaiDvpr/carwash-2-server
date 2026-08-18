"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MapRef } from "react-map-gl/maplibre";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Supercluster from "supercluster";
import type { Station, StationKind } from "@/data/stations";
import Toast from "@/components/ui/Toast";
import StationMapDrawer from "@/features/home/components/StationMapDrawer";
import MyServicesIcon from "@/features/home/components/MyServicesIcon";
import {
  detailsChargingPath,
  mapActiveEvSessions,
  type MapLiveSession,
} from "@/features/home/mapLiveSession";
import { fetchActiveEvSessions } from "@/lib/api/evSessions";
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
import MarkerFaceContent from "@/features/map/MarkerFaceContent";
import MarkerProgress from "@/features/map/MarkerProgress";
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
  /** Скрыть хвостик, когда открыт drawer точки */
  hideTip?: boolean;
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
  /** Свободные посты мойки / пистолеты ЭЗС на этой точке */
  freeCount: number;
  washFree: number;
  chargingFree: number;
  washSites: number;
  chargingSites: number;
};

type StationClusterProps = {
  freeCount: number;
  /** Сумма свободных постов мойки */
  washFree: number;
  /** Сумма свободных пистолетов ЭЗС */
  chargingFree: number;
  washSites: number;
  chargingSites: number;
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

function MapError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="map-error">
      <p className="map-error__title">{t("map.unavailable", "Карта недоступна")}</p>
      <p className="map-error__text">
        {t("map.check_internet", "Проверьте интернет и обновите страницу")}
      </p>
      <button
        type="button"
        className="map-error__retry"
        onClick={onRetry}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2M19.5 12a7.5 7.5 0 0 1-12.9 5.2"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 4.5v4h-4M6.5 19.5v-4h4" />
        </svg>
        {t("common.refresh", "Обновить")}
      </button>
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
  hideTip = false,
}: StationDotProps) {
  const isCharging = station.kind === "charging";
  const prefs = isCharging ? chargingPrefs : washPrefs;
  const shapeId = clampMarkerShapeId(prefs?.shapeId ?? 4);
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
  const markerClass = markerStyleClass(
    isCharging ? "charging" : "wash",
    shapeId,
  );

  return (
    <button
      type="button"
      className={`${markerClass}${hideTip ? " map-marker--no-tip" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(station);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${station.name}: ${free} свободно`}
      title={`${free} свободно`}
      style={
        {
          "--map-marker-free": String(freeRatio),
          ...(prefs ? markerColorStyle(prefs) : null),
        } as CSSProperties
      }
    >
      <MarkerProgress free={free} total={total} />
      <span className="map-marker__face">
        <MarkerFaceContent
          kind={isCharging ? "charging" : "wash"}
          prefs={prefs ?? DEFAULT_MARKER_STYLE_PREFS[isCharging ? "charging" : "wash"]}
          free={free}
          total={total}
          icon={
            isCharging ? (
              <EvIcon className="map-marker__icon-svg" />
            ) : (
              <WashIcon className="map-marker__icon-svg" />
            )
          }
        />
      </span>
      {!hideTip ? <span className="map-marker__tip" aria-hidden /> : null}
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

/** Свободные посты мойки или пистолеты ЭЗС */
function stationFreeCount(station: Station): number {
  return Math.max(0, station.freeSlots ?? 0);
}

function ZoomClusterBubble({
  freeTotal,
  washFree,
  chargingFree,
  washSites,
  chargingSites,
  locationsCount,
  onExpand,
  washPrefs,
  chargingPrefs,
}: {
  freeTotal: number;
  washFree: number;
  chargingFree: number;
  washSites: number;
  chargingSites: number;
  locationsCount: number;
  onExpand: () => void;
  washPrefs: KindMarkerPrefs;
  chargingPrefs: KindMarkerPrefs;
}) {
  const hasWash = washSites > 0;
  const hasCharging = chargingSites > 0;
  const mixed = hasWash && hasCharging;
  const kindClass = mixed
    ? "map-cluster--mixed"
    : hasWash
      ? "map-cluster--wash"
      : "map-cluster--charging";

  return (
    <button
      type="button"
      className={`map-cluster map-cluster--pill ${kindClass}`}
      style={
        {
          "--cluster-wash": washPrefs.accent,
          "--cluster-wash-ink": washPrefs.ink,
          "--cluster-charging": chargingPrefs.accent,
          "--cluster-charging-ink": chargingPrefs.ink,
          "--cluster-border": "#ffffff",
        } as CSSProperties
      }
      onClick={(event) => {
        event.stopPropagation();
        onExpand();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={
        mixed
          ? `Свободно: посты ${washFree}, пистолеты ${chargingFree} · ${locationsCount} точек — приблизить`
          : hasWash
            ? `Свободно постов мойки ${freeTotal} · ${locationsCount} точек — приблизить`
            : `Свободно пистолетов ${freeTotal} · ${locationsCount} точек — приблизить`
      }
    >
      {mixed ? (
        <>
          <span className="map-cluster__half map-cluster__half--wash">
            <WashIcon className="map-cluster__icon" />
            <span className="map-cluster__num">{washFree}</span>
          </span>
          <span className="map-cluster__half map-cluster__half--charging">
            <EvIcon className="map-cluster__icon map-cluster__icon--ev" />
            <span className="map-cluster__num">{chargingFree}</span>
          </span>
        </>
      ) : (
        <span className="map-cluster__solo">
          {hasWash ? (
            <WashIcon className="map-cluster__icon" />
          ) : (
            <EvIcon className="map-cluster__icon map-cluster__icon--ev" />
          )}
          <span className="map-cluster__num">{freeTotal}</span>
        </span>
      )}
      <span className="map-cluster__tip" aria-hidden />
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
    sessionFab: {
      kind: "wash" | "charging" | "idle";
      active: boolean;
      label: string;
      onOpen: () => void;
    };
  };
  return function MapView({
    stations,
    cityCenter,
    focusStation,
    selectedStation,
    onSelectStation,
    washPrefs,
    chargingPrefs,
    sessionFab,
  }: MapViewProps) {
    const [status, setStatus] = useState<MapStatus>("loading");
    const [mapRetryKey, setMapRetryKey] = useState(0);
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
          freeCount: props.freeCount,
          washFree: props.washFree,
          chargingFree: props.chargingFree,
          washSites: props.washSites,
          chargingSites: props.chargingSites,
        }),
        reduce: (accumulated, props) => {
          accumulated.freeCount += props.freeCount;
          accumulated.washFree += props.washFree;
          accumulated.chargingFree += props.chargingFree;
          accumulated.washSites += props.washSites;
          accumulated.chargingSites += props.chargingSites;
        },
      });

      index.load(
        stations.map((station) => {
          const freeCount = stationFreeCount(station);
          const isWash = station.kind === "wash";
          return {
            type: "Feature" as const,
            properties: {
              stationId: station.id,
              kind: station.kind,
              freeCount,
              washFree: isWash ? freeCount : 0,
              chargingFree: isWash ? 0 : freeCount,
              washSites: isWash ? 1 : 0,
              chargingSites: isWash ? 0 : 1,
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
      <div className={`map-root${sessionFab.active ? " map-root--session-fab" : ""}`}>
        {status === "loading" && <MapLoading />}
        {status === "error" && (
          <MapError
            onRetry={() => {
              setStatus("loading");
              setMapRetryKey((key) => key + 1);
            }}
          />
        )}
        {status === "ready" && (
          <div
            className="map-zoom-controls"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={`map-session-fab map-session-fab--${sessionFab.kind}${sessionFab.active ? " is-active" : ""}`}
              onClick={sessionFab.onOpen}
              aria-label={sessionFab.label}
              title={sessionFab.label}
            >
              <span className="map-session-fab__icon" aria-hidden>
                <MyServicesIcon />
              </span>
            </button>
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
          key={mapRetryKey}
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
                        hideTip={selectedStation?.id === station.id}
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
                          hideTip={selectedStation?.id === station.id}
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
                  const washFree = Number(props.washFree ?? 0);
                  const chargingFree = Number(props.chargingFree ?? 0);
                  const washSites = Number(props.washSites ?? 0);
                  const chargingSites = Number(props.chargingSites ?? 0);
                  const freeTotal = Math.max(
                    0,
                    Number(props.freeCount ?? washFree + chargingFree),
                  );

                  return [
                    <Marker
                      key={`cluster-${clusterId}`}
                      longitude={longitude}
                      latitude={latitude}
                      anchor="bottom"
                    >
                      <ZoomClusterBubble
                        freeTotal={freeTotal}
                        washFree={washFree}
                        chargingFree={chargingFree}
                        washSites={washSites}
                        chargingSites={chargingSites}
                        locationsCount={locationsCount}
                        washPrefs={washPrefs}
                        chargingPrefs={chargingPrefs}
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
                      hideTip={selectedStation?.id === station.id}
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

function MapServicesDrawer({
  onClose,
  onSessionsLoaded,
  onOpenSession,
}: {
  onClose: () => void;
  onSessionsLoaded: (sessions: MapLiveSession[]) => void;
  onOpenSession: (session: MapLiveSession) => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MapLiveSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sessions = await fetchActiveEvSessions();
        if (cancelled) return;
        const mapped = mapActiveEvSessions(sessions);
        setItems(mapped);
        onSessionsLoaded(mapped);
      } catch {
        if (cancelled) return;
        setItems([]);
        onSessionsLoaded([]);
        setError(
          t("map.services_load_error", "Не удалось загрузить активные услуги"),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [onSessionsLoaded, t]);

  const count = items.length;
  const summary =
    !loading && !error && count > 0
      ? t("map.services_active_count", "{n} активных").replace("{n}", String(count))
      : null;

  return (
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="map-list-sheet map-list-sheet--services is-expanded"
        role="dialog"
        aria-label={t("map.my_services", "Мои услуги")}
      >
        <div className="map-list-sheet__header">
          <div className="map-list-sheet__title-row">
            <div className="map-list-sheet__heading">
              <h2 className="map-list-sheet__title">
                {t("map.my_services", "Мои услуги")}
              </h2>
              {summary ? (
                <p className="map-list-sheet__summary">{summary}</p>
              ) : null}
            </div>
            <div className="map-list-sheet__tools">
              <button
                type="button"
                className="app-drawer-close"
                onClick={onClose}
                aria-label={t("common.close", "Закрыть")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
          {loading ? (
            <p className="map-list-sheet__loading">
              {t("map.services_loading", "Загружаем услуги…")}
            </p>
          ) : null}
        </div>

        <div className="map-list-sheet__scroll">
          {error ? (
            <div className="map-services-empty" role="alert">
              <span className="map-services-empty__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a1.8 1.8 0 0 0 1.6 2.7h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z"
                  />
                </svg>
              </span>
              <p className="map-services-empty__title">{error}</p>
            </div>
          ) : !loading && items.length === 0 ? (
            <div className="map-services-empty" role="status">
              <span className="map-services-empty__icon" aria-hidden>
                <MyServicesIcon />
              </span>
              <p className="map-services-empty__title">
                {t("map.no_services_title", "Никаких услуг нет")}
              </p>
              <p className="map-services-empty__text">
                {t(
                  "map.no_services_text",
                  "Когда машина будет мыться или заряжаться, статус появится здесь.",
                )}
              </p>
            </div>
          ) : !loading ? (
            <ul className="map-services-list">
              {items.map((session) => {
                const isDone = session.step === "charged_ok";
                const statusLabel =
                  session.kind === "wash"
                    ? isDone
                      ? t("map.session_wash_done", "Мойка завершена")
                      : t("map.session_washing", "Машина моется")
                    : isDone
                      ? t("map.session_charge_done", "Зарядка завершена")
                      : t("map.session_charging", "Машина заряжается");
                const kindLabel =
                  session.kind === "wash"
                    ? t("common.wash", "Мойка")
                    : t("common.charging", "ЭЗС");
                const place =
                  session.address && session.address !== session.stationName
                    ? `${session.stationName} · ${session.address}`
                    : session.stationName || session.address;
                return (
                  <li key={`${session.kind}-${session.dbSessionId}`}>
                    <button
                      type="button"
                      className={`map-services-row map-services-row--${session.kind}${isDone ? " is-done" : ""}`}
                      onClick={() => onOpenSession(session)}
                    >
                      <span className="map-services-row__icon" aria-hidden>
                        {session.kind === "wash" ? (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
                          </svg>
                        ) : (
                          <svg viewBox="7 3 10 18" fill="currentColor">
                            <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                          </svg>
                        )}
                      </span>
                      <span className="map-services-row__main">
                        <span className="map-services-row__kind">{kindLabel}</span>
                        <span className="map-services-row__title">{place}</span>
                        <span className="map-services-row__status">{statusLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </>
  );
}

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
  const router = useRouter();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activeSessions, setActiveSessions] = useState<MapLiveSession[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeSession, setResumeSession] = useState<MapLiveSession | null>(null);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const { geoId, cities } = useUserCity();
  const { location: userLocation, loading: locationLoading } = useUserLocation();

  const refreshActiveSessions = useCallback(async () => {
    try {
      const sessions = await fetchActiveEvSessions();
      setActiveSessions(mapActiveEvSessions(sessions));
    } catch {
      /* без токена / сеть — FAB просто idle */
      setActiveSessions([]);
    }
  }, []);

  const handleSessionsLoaded = useCallback((sessions: MapLiveSession[]) => {
    setActiveSessions(sessions);
  }, []);

  useEffect(() => {
    setPortalReady(true);
    void refreshActiveSessions();
    const onFocus = () => void refreshActiveSessions();
    window.addEventListener("focus", onFocus);
    const tick = window.setInterval(() => void refreshActiveSessions(), 20_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(tick);
    };
  }, [refreshActiveSessions]);

  // Локально обновляем step, когда истёк planned_end_at
  useEffect(() => {
    const ends = activeSessions
      .filter((s) => s.step === "charging" && s.chargeEndsAt != null)
      .map((s) => s.chargeEndsAt as number);
    if (ends.length === 0) return;

    const tick = window.setInterval(() => {
      const now = Date.now();
      setActiveSessions((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (
            s.step === "charging" &&
            s.chargeEndsAt != null &&
            now >= s.chargeEndsAt
          ) {
            changed = true;
            return { ...s, step: "charged_ok" as const, chargeEndsAt: null };
          }
          return s;
        });
        return changed ? next : prev;
      });
    }, 400);
    return () => window.clearInterval(tick);
  }, [activeSessions]);

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
    setResumeOpen(false);
    setResumeSession(null);
  }, [focusStation]);

  const hasLiveSession = activeSessions.length > 0;
  const fabKind =
    activeSessions.find((s) => s.kind === "charging")?.kind ??
    activeSessions[0]?.kind ??
    "idle";

  function openServicesFab() {
    setSelectedStation(null);
    setResumeOpen(false);
    setResumeSession(null);
    setServicesOpen(true);
  }

  function openServiceFromDrawer(session: MapLiveSession) {
    setServicesOpen(false);
    if (session.kind === "charging") {
      setSelectedStation(null);
      setResumeOpen(false);
      setResumeSession(null);
      router.push(detailsChargingPath(session.dbSessionId));
      return;
    }
    const full = stations.find((s) => s.id === session.stationId) ?? null;
    if (!full) return;
    setResumeSession(session);
    setResumeOpen(true);
    setSelectedStation(full);
  }

  function clearLiveSession() {
    setActiveSessions([]);
    setResumeOpen(false);
    setResumeSession(null);
    void refreshActiveSessions();
  }

  const sessionFabLabel = hasLiveSession
    ? t("map.my_services_count", "Мои услуги ({n})").replace(
        "{n}",
        String(activeSessions.length),
      )
    : t("map.my_services", "Мои услуги");

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
                sessionFab={{
                  kind: fabKind,
                  active: hasLiveSession,
                  label: sessionFabLabel,
                  onOpen: openServicesFab,
                }}
                onSelectStation={(station) => {
                  setServicesOpen(false);
                  setResumeOpen(false);
                  setResumeSession(null);
                  setSelectedStation(station);
                  if (!station) onFocusConsumed?.();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {portalReady &&
        servicesOpen &&
        !selectedStation &&
        createPortal(
          <MapServicesDrawer
            onClose={() => setServicesOpen(false)}
            onSessionsLoaded={handleSessionsLoaded}
            onOpenSession={openServiceFromDrawer}
          />,
          document.body,
        )}

      {portalReady &&
        selectedStation &&
        createPortal(
          <StationMapDrawer
            key={`${selectedStation.id}-${resumeOpen ? `resume-${resumeSession?.dbSessionId ?? "x"}` : "browse"}`}
            station={selectedStation}
            userLocation={userLocation}
            resumeSession={
              resumeOpen &&
              resumeSession &&
              resumeSession.stationId === selectedStation.id
                ? {
                    standId: resumeSession.standId,
                    portId: resumeSession.portId,
                    step: resumeSession.step,
                    chargeEndsAt: resumeSession.chargeEndsAt,
                    dbSessionId: resumeSession.dbSessionId,
                  }
                : null
            }
            onLiveSessionChange={(session) => {
              if (session?.kind === "charging" && session.dbSessionId) {
                void refreshActiveSessions();
              } else if (!session) {
                void refreshActiveSessions();
              }
            }}
            onPayNavigate={clearLiveSession}
            onMinimize={() => {
              setSelectedStation(null);
              setResumeOpen(false);
              setResumeSession(null);
              onFocusConsumed?.();
            }}
            onClose={() => {
              setSelectedStation(null);
              setResumeOpen(false);
              setResumeSession(null);
              onFocusConsumed?.();
            }}
          />,
          document.body,
        )}
    </>
  );
}
