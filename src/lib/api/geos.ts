import { apiFetch } from "@/lib/api";

export type GeoCity = {
  id: number;
  country: string;
  city: string;
};

export type MapCenter = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type GeosResponse = {
  total: number;
  geos: GeoCity[];
};

const CITY_LABELS: Record<string, string> = {
  Almaty: "Алматы",
  Astana: "Астана",
  Shymkent: "Шымкент",
  Karaganda: "Қарағанды",
  Aktobe: "Ақтөбе",
};

/** Центры городов: обзор города по центру, не зум на мойку. */
const CITY_CENTERS: Record<string, MapCenter> = {
  Almaty: { longitude: 76.889709, latitude: 43.238949, zoom: 10 },
  Astana: { longitude: 71.4304, latitude: 51.1282, zoom: 10 },
  Shymkent: { longitude: 69.597, latitude: 42.3417, zoom: 10 },
  Karaganda: { longitude: 73.1021, latitude: 49.8047, zoom: 10 },
  Aktobe: { longitude: 57.1667, latitude: 50.2833, zoom: 10 },
};

const DEFAULT_MAP_CENTER: MapCenter = CITY_CENTERS.Almaty!;

export function formatCityName(city: string): string {
  return CITY_LABELS[city] ?? city;
}

/** Расстояние между двумя точками в км (haversine). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Радиус «внутри города» для автофильтра списка, км. */
const NEAREST_CITY_MAX_KM = 100;

/**
 * Ближайший город из справочника по координатам.
 * null — если точка дальше NEAREST_CITY_MAX_KM от любого центра.
 */
export function findNearestCity(
  latitude: number,
  longitude: number,
  cities: GeoCity[],
  maxKm = NEAREST_CITY_MAX_KM,
): GeoCity | null {
  let best: GeoCity | null = null;
  let bestKm = Number.POSITIVE_INFINITY;

  for (const city of cities) {
    const center = CITY_CENTERS[city.city];
    if (!center) continue;
    const km = distanceKm(latitude, longitude, center.latitude, center.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }

  if (!best || bestKm > maxKm) return null;
  return best;
}

/** Центр карты по названию города или geo_id из справочника. */
export function getCityMapCenter(
  cityOrGeoId?: string | number | null,
  cities?: GeoCity[],
): MapCenter {
  if (typeof cityOrGeoId === "number" && cities?.length) {
    const match = cities.find((geo) => geo.id === cityOrGeoId);
    if (match) return CITY_CENTERS[match.city] ?? DEFAULT_MAP_CENTER;
  }

  if (typeof cityOrGeoId === "string" && cityOrGeoId in CITY_CENTERS) {
    return CITY_CENTERS[cityOrGeoId]!;
  }

  return DEFAULT_MAP_CENTER;
}

export async function fetchGeos(): Promise<GeoCity[]> {
  const data = await apiFetch<GeosResponse>("/api/geos");
  return data.geos ?? [];
}
