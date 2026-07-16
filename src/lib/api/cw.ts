import type { Station, StationKind } from "@/data/stations";
import { apiFetch } from "@/lib/api";
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
  description: string | null;
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

  const tariffs = (location.tariffs ?? []).map((tariff) => ({
    id: tariff.id,
    title: tariff.title,
    price: Number(tariff.price),
    description: tariff.description ?? "",
  }));

  return {
    id: String(location.id),
    name: kind === "charging" ? `ЭЗС · ${location.address}` : `CarWash · ${location.address}`,
    address: location.address,
    status: location.status,
    kind,
    photoUrl: location.photo_url,
    hoursLabel: formatOpenHoursLabel(location.open_hours),
    freeSlots: washers.filter((w) => w.status === "free").length,
    washersTotal: washers.length,
    washers,
    latitude: lat,
    longitude: lng,
    map_2gis: location.map_2gis ?? "",
    map_yandex: location.map_yandex ?? "",
    /** Для реальных моек — id локации; slug вроде Sauran — под гео */
    paymentSlug: String(location.id),
    paymentTitle: location.address,
    market: [],
    tariff: tariffs,
  };
}

export async function fetchCwLocations(): Promise<CwLocation[]> {
  const data = await apiFetch<LocationsResponse>("/api/cw/locations");
  return data.locations;
}

export async function fetchCwStations(): Promise<Station[]> {
  const locations = await fetchCwLocations();
  return locations.map(toStation);
}

export async function fetchCwLocation(id: number | string): Promise<CwLocation> {
  const data = await apiFetch<LocationResponse>(`/api/cw/locations/${id}`);
  return data.location;
}

export async function fetchCwStation(id: number | string): Promise<Station> {
  return toStation(await fetchCwLocation(id));
}
