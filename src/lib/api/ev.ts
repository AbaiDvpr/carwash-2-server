import type { Station } from "@/data/stations";
import { apiFetch } from "@/lib/api";
import { toDisplayWasherStatus } from "@/lib/api/cw";
import { formatOpenHoursLabel } from "@/lib/openHours";

export type EvPistol = {
  id: number;
  type_id: number;
  type: string | null;
  type_photo_url: string | null;
  status_id: number;
  status: string | null;
  status_ru: string | null;
  status_en: string | null;
  status_kk: string | null;
};

export type EvCharger = {
  id: number;
  type: string | null;
  power: number | null;
  price_per_kwh: number | string | null;
  pistols: EvPistol[];
};

export type EvLocation = {
  id: number;
  kind?: string | null;
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
  chargers_total: number;
  pistols_total: number;
  free_slots: number;
  chargers: EvCharger[];
};

type LocationsResponse = {
  locations: EvLocation[];
};

type LocationResponse = {
  location: EvLocation;
};

export function evStationId(id: number | string): string {
  return `ev-${id}`;
}

export function parseEvStationId(id: string): number | null {
  if (!id.startsWith("ev-")) return null;
  const num = Number(id.slice(3));
  return Number.isFinite(num) ? num : null;
}

/** Маппинг EV API → Station (kind=charging), id вида ev-{n} */
export function toEvStation(location: EvLocation): Station {
  const lat = location.latitude ?? location.coordinates?.lat ?? 0;
  const lng = location.longitude ?? location.coordinates?.lng ?? 0;

  const pistols = location.chargers.flatMap((charger) =>
    (charger.pistols ?? []).map((pistol) => {
      const display = toDisplayWasherStatus(pistol.status);
      const typeLabel = pistol.type ? `${pistol.type} · ` : "";
      return {
        id: pistol.id,
        status: display.status,
        statusLabel: `${typeLabel}${display.statusLabel}`,
      };
    }),
  );

  const tariffs = location.chargers
    .filter((c) => c.price_per_kwh != null)
    .map((charger) => ({
      title: `${charger.type || "Зарядка"}${charger.power ? ` · ${charger.power} кВт` : ""}`,
      price: Number(charger.price_per_kwh),
      description: "за кВт·ч",
    }));

  return {
    id: evStationId(location.id),
    name: `ЭЗС · ${location.address}`,
    address: location.address,
    status: location.status,
    kind: "charging",
    photoUrl: location.photo_url,
    hoursLabel: formatOpenHoursLabel(location.open_hours),
    freeSlots: pistols.filter((p) => p.status === "free").length,
    washersTotal: pistols.length,
    washers: pistols,
    latitude: lat,
    longitude: lng,
    map_2gis: location.map_2gis ?? "",
    map_yandex: location.map_yandex ?? "",
    paymentSlug: evStationId(location.id),
    paymentTitle: location.address,
    market: [],
    tariff: tariffs,
  };
}

export async function fetchEvLocations(): Promise<EvLocation[]> {
  const data = await apiFetch<LocationsResponse>("/api/ev/locations");
  return data.locations;
}

export async function fetchEvStations(): Promise<Station[]> {
  const locations = await fetchEvLocations();
  return locations.map(toEvStation);
}

export async function fetchEvLocation(id: number | string): Promise<EvLocation> {
  const data = await apiFetch<LocationResponse>(`/api/ev/locations/${id}`);
  return data.location;
}

export async function fetchEvStation(id: number | string): Promise<Station> {
  return toEvStation(await fetchEvLocation(id));
}
