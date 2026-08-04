import type { Station, StationKind } from "@/data/stations";
import { apiFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/api/photo";
import { formatOpenHoursLabel } from "@/lib/openHours";

export type CwWasher = {
  id: number;
  status_id: number;
  status: string | null;
  status_ru: string | null;
  status_en: string | null;
  status_kk: string | null;
};

export type CwTariff = {
  id: number;
  title: string;
  title_ru?: string | null;
  title_en?: string | null;
  description: string | null;
  description_ru?: string | null;
  description_en?: string | null;
  composition?: { ru: string; en: string }[] | null;
  items_ru?: string[] | null;
  items_en?: string[] | null;
  price: number;
};

export type CwLocation = {
  id: number;
  address: string;
  geo_id: number | null;
  ownership_id: number | null;
  photo_url: string | null;
  coordinates: { lat?: number; lng?: number } | null;
  latitude: number | null;
  longitude: number | null;
  map_links: { "2gis"?: string; yandex?: string } | null;
  map_2gis: string | null;
  map_yandex: string | null;
  open_hours: Record<string, string> | null;
  is_open: boolean;
  status: "Открыто" | "Закрыто";
  washers_total: number;
  stations_count?: number | null;
  free_slots: number;
  washers: CwWasher[];
  tariffs?: CwTariff[];
  /** Опционально с бэка; без поля считаем мойкой */
  kind?: StationKind | "carwash" | "ev" | "charging" | null;
  type?: string | null;
};

type LocationsResponse = {
  locations: CwLocation[];
};

type LocationResponse = {
  location: CwLocation;
};

/** Для UI поста только: free | busy | offline */
export function toDisplayWasherStatus(status: string | null): {
  status: "free" | "busy" | "offline";
  statusLabel: string;
} {
  if (status === "free") {
    return { status: "free", statusLabel: "Свободен" };
  }
  if (status === "busy") {
    return { status: "busy", statusLabel: "Занят" };
  }
  return { status: "offline", statusLabel: "Не в сети" };
}

function toStationKind(location: CwLocation): StationKind {
  const raw = (location.kind ?? location.type ?? "wash").toString().toLowerCase();
  if (raw === "wash" || raw === "carwash" || raw === "cw") {
    return "wash";
  }
  if (
    raw === "charging" ||
    raw === "ev" ||
    raw === "electro" ||
    raw === "electric" ||
    raw.includes("charg") ||
    raw.includes("electro")
  ) {
    return "charging";
  }
  return "wash";
}

/** Маппинг ответа API → Station для UI */
export function toStation(location: CwLocation): Station {
  const lat = location.latitude ?? location.coordinates?.lat ?? 0;
  const lng = location.longitude ?? location.coordinates?.lng ?? 0;

  const washers = location.washers.map((washer) => {
    const display = toDisplayWasherStatus(washer.status);
    return {
      id: washer.id,
      status: display.status,
      statusLabel: display.statusLabel,
    };
  });

  const kind = toStationKind(location);

  const tariffs = (location.tariffs ?? []).map((tariff) => {
    const titleRu = tariff.title_ru || tariff.title;
    const descriptionRu = tariff.description_ru || tariff.description || "";
    const composition = tariff.composition ?? [];
    const itemsRu =
      tariff.items_ru ?? composition.map((row) => row.ru || row.en);

    return {
      id: tariff.id,
      title: titleRu,
      titleRu,
      titleEn: tariff.title_en ?? null,
      price: Number(tariff.price),
      description: descriptionRu,
      descriptionRu,
      descriptionEn: tariff.description_en ?? null,
      items: itemsRu,
      composition,
    };
  });

  return {
    id: String(location.id),
    name: kind === "charging" ? `ЭЗС · ${location.address}` : `CarWash · ${location.address}`,
    address: location.address,
    status: location.status,
    kind,
    geoId: location.geo_id ?? null,
    photoUrl: resolveMediaUrl(location.photo_url),
    hoursLabel: formatOpenHoursLabel(location.open_hours),
    openHours: location.open_hours ?? null,
    freeSlots: washers.filter((w) => w.status === "free").length,
    washersTotal: washers.length,
    washers,
    latitude: lat,
    longitude: lng,
    map_2gis: location.map_2gis ?? "",
    map_yandex: location.map_yandex ?? "",
    paymentSlug: String(location.id),
    paymentTitle: location.address,
    market: [],
    tariff: tariffs,
    stationsCount:
      location.stations_count != null && location.stations_count > 0
        ? location.stations_count
        : Math.max(1, washers.length || location.washers_total || 1),
  };
}

export function localizeWashTariff<
  T extends {
    title: string;
    titleRu?: string | null;
    titleEn?: string | null;
    description: string;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
    items?: string[];
    composition?: { ru: string; en: string }[];
  },
>(tariff: T, locale: string) {
  const useEn = locale.toLowerCase().startsWith("en");
  const title = useEn
    ? tariff.titleEn || tariff.titleRu || tariff.title
    : tariff.titleRu || tariff.title;
  const description = useEn
    ? tariff.descriptionEn || tariff.descriptionRu || tariff.description || ""
    : tariff.descriptionRu || tariff.description || "";
  const items = useEn
    ? (tariff.composition ?? []).map((row) => row.en || row.ru)
    : tariff.items ??
      (tariff.composition ?? []).map((row) => row.ru || row.en);

  return { ...tariff, title, description, items };
}

export type FetchLocationsOptions = {
  /** Все города, без фильтра по geo_id */
  all?: boolean;
  geoId?: number | null;
};

export async function fetchCwLocations(
  options: FetchLocationsOptions = {},
): Promise<CwLocation[]> {
  const params = new URLSearchParams();
  if (options.all) {
    params.set("all", "1");
  } else if (options.geoId != null) {
    params.set("geo_id", String(options.geoId));
  }
  const query = params.toString();
  const data = await apiFetch<LocationsResponse>(
    `/api/cw/locations${query ? `?${query}` : ""}`,
  );
  return data.locations;
}

export async function fetchCwStations(
  options: FetchLocationsOptions = {},
): Promise<Station[]> {
  const locations = await fetchCwLocations(options);
  return locations.map(toStation);
}

export async function fetchCwLocation(id: number | string): Promise<CwLocation> {
  const data = await apiFetch<LocationResponse>(`/api/cw/locations/${id}`);
  return data.location;
}

export async function fetchCwStation(id: number | string): Promise<Station> {
  return toStation(await fetchCwLocation(id));
}
