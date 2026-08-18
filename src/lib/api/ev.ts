import type {
  Station,
  StationChargerStand,
  StationConnector,
  StationConnectorPort,
} from "@/data/stations";
import {
  connectorLabel,
  isAcSlug,
  isDcSlug,
  normalizeConnectorType,
  parsePricePerKwh,
  type ConnectorSlug,
} from "@/features/map/evConnectors";
import { apiFetch } from "@/lib/api";
import { type FetchLocationsOptions } from "@/lib/api/cw";
import { resolveMediaUrl } from "@/lib/api/photo";
import { formatOpenHoursLabel } from "@/lib/openHours";

/** Статус коннектора для UI */
export function toDisplayEvPortStatus(status: string | null): {
  status: "free" | "charging" | "busy" | "offline";
  statusLabel: string;
} {
  if (status === "free") {
    return { status: "free", statusLabel: "Свободен" };
  }
  if (status === "charging" || status === "in_progress") {
    return { status: "charging", statusLabel: "Заряжается" };
  }
  if (status === "busy") {
    return { status: "busy", statusLabel: "Занят" };
  }
  return { status: "offline", statusLabel: "Не в сети" };
}

export type EvPistol = {
  id: number;
  type_id: number;
  type: string | null;
  type_photo_url: string | null;
  price_per_kwh?: number | string | null;
  status_id: number;
  status: string | null;
  status_ru: string | null;
  status_en: string | null;
  status_kk: string | null;
  charge_percent?: number | null;
};

export type EvCharger = {
  id: number;
  type: string | null;
  power: number | null;
  price_per_kwh: number | string | null;
  map_2gis?: string | null;
  map_yandex?: string | null;
  pistols: EvPistol[];
};

export type EvTariff = {
  id: number;
  charger_id: number;
  title: string;
  description: string | null;
  kwh: number;
  price: number;
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
  status: "Открыто" | "Закрыто" | "Занято";
  chargers_total: number;
  stations_count?: number | null;
  pistols_total: number;
  free_slots: number;
  chargers: EvCharger[];
  tariffs?: EvTariff[];
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

function buildEvConnectors(chargers: EvCharger[]): {
  connectors: StationConnector[];
  connectorPorts: StationConnectorPort[];
  chargerStands: StationChargerStand[];
  maxPowerKw: number | null;
  pricePerKwh: number | null;
  hasDc: boolean;
  hasAc: boolean;
} {
  const bySlug = new Map<string, StationConnector>();
  const connectorPorts: StationConnectorPort[] = [];
  const chargerStands: StationChargerStand[] = [];
  let maxPowerKw: number | null = null;
  let pricePerKwh: number | null = null;
  let hasDc = false;
  let hasAc = false;

  chargers.forEach((charger, chargerIndex) => {
    const power =
      charger.power != null && Number.isFinite(Number(charger.power))
        ? Number(charger.power)
        : null;
    if (power != null) {
      maxPowerKw = maxPowerKw == null ? power : Math.max(maxPowerKw, power);
    }

    const chargerPrice = parsePricePerKwh(charger.price_per_kwh);
    if (chargerPrice != null) {
      pricePerKwh =
        pricePerKwh == null ? chargerPrice : Math.min(pricePerKwh, chargerPrice);
    }

    const chargerType = (charger.type ?? "").toLowerCase();
    if (chargerType.includes("dc") || (power != null && power >= 50)) {
      hasDc = true;
    }
    if (chargerType.includes("ac") || (power != null && power < 50)) {
      hasAc = true;
    }

    const standPorts: StationConnectorPort[] = [];

    for (const pistol of charger.pistols ?? []) {
      const slug = normalizeConnectorType(pistol.type);
      if (isDcSlug(slug)) hasDc = true;
      if (isAcSlug(slug)) hasAc = true;

      const display = toDisplayEvPortStatus(pistol.status);
      const baseLabel =
        slug === "other" && pistol.type
          ? pistol.type
          : connectorLabel(slug as ConnectorSlug);
      const portPrice =
        parsePricePerKwh(pistol.price_per_kwh) ?? chargerPrice;
      if (portPrice != null) {
        pricePerKwh =
          pricePerKwh == null ? portPrice : Math.min(pricePerKwh, portPrice);
      }

      const letter = String.fromCharCode(65 + standPorts.length);
      const port: StationConnectorPort = {
        id: pistol.id,
        slug,
        label: `${baseLabel} - ${letter}`,
        powerKw: power,
        pricePerKwh: portPrice,
        status: display.status,
        statusLabel: display.statusLabel,
        photoUrl: resolveMediaUrl(pistol.type_photo_url),
        chargePercent:
          pistol.charge_percent != null && Number.isFinite(pistol.charge_percent)
            ? Math.min(100, Math.max(0, Math.round(Number(pistol.charge_percent))))
            : null,
      };

      standPorts.push(port);
      connectorPorts.push(port);

      const prev = bySlug.get(slug);
      if (!prev) {
        bySlug.set(slug, {
          slug,
          label: baseLabel,
          powerKw: power,
          status: display.status,
          photoUrl: port.photoUrl,
        });
        continue;
      }

      const nextPower =
        power != null && (prev.powerKw == null || power > prev.powerKw)
          ? power
          : prev.powerKw;
      const nextStatus =
        prev.status === "free" || display.status === "free"
          ? "free"
          : display.status === "charging" || prev.status === "charging"
            ? "charging"
            : display.status === "busy" || prev.status === "busy"
              ? "busy"
              : display.status ?? prev.status;

      bySlug.set(slug, {
        ...prev,
        powerKw: nextPower,
        status: nextStatus,
        photoUrl: prev.photoUrl ?? port.photoUrl,
      });
    }

    chargerStands.push({
      id: charger.id,
      index: chargerIndex + 1,
      title: `Станция №${chargerIndex + 1}`,
      type: charger.type?.trim() || null,
      powerKw: power,
      pricePerKwh: chargerPrice,
      ports: standPorts,
      map2gis: charger.map_2gis?.trim() || null,
      mapYandex: charger.map_yandex?.trim() || null,
    });
  });

  return {
    connectors: Array.from(bySlug.values()),
    connectorPorts,
    chargerStands,
    maxPowerKw,
    pricePerKwh,
    hasDc,
    hasAc,
  };
}

/** Маппинг EV API → Station (kind=charging), id вида ev-{n} */
export function toEvStation(location: EvLocation): Station {
  const lat = location.latitude ?? location.coordinates?.lat ?? 0;
  const lng = location.longitude ?? location.coordinates?.lng ?? 0;

  const pistols = location.chargers.flatMap((charger) =>
    (charger.pistols ?? []).map((pistol) => {
      const display = toDisplayEvPortStatus(pistol.status);
      const typeLabel = pistol.type ? `${pistol.type} · ` : "";
      return {
        id: pistol.id,
        status: display.status,
        statusLabel: `${typeLabel}${display.statusLabel}`,
      };
    }),
  );

  const tariffs = (location.tariffs ?? []).map((tariff) => ({
    id: tariff.id,
    title: tariff.title,
    price: Number(tariff.price),
    description: tariff.description ?? `${tariff.kwh} кВт·ч`,
  }));

  const evMeta = buildEvConnectors(location.chargers ?? []);
  const tariffMin = tariffs.length
    ? Math.min(...tariffs.map((item) => item.price).filter((n) => Number.isFinite(n)))
    : null;
  const pricePerKwh =
    evMeta.pricePerKwh ??
    (tariffMin != null && Number.isFinite(tariffMin) ? tariffMin : null);

  const stationsCount =
    location.stations_count != null && location.stations_count > 0
      ? location.stations_count
      : Math.max(1, location.chargers_total || (location.chargers ?? []).length || 1);

  const freeSlots =
    typeof location.free_slots === "number"
      ? Math.max(0, location.free_slots)
      : pistols.filter((p) => p.status === "free").length;
  const hoursOpen = location.is_open || location.status === "Открыто" || location.status === "Занято";
  const status: Station["status"] =
    hoursOpen && freeSlots > 0 ? "Открыто" : hoursOpen ? "Занято" : "Закрыто";

  return {
    id: evStationId(location.id),
    name: location.address,
    address: location.address,
    status,
    kind: "charging",
    geoId: location.geo_id ?? null,
    photoUrl: resolveMediaUrl(location.photo_url),
    hoursLabel: formatOpenHoursLabel(location.open_hours),
    openHours: location.open_hours ?? null,
    freeSlots,
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
    maxPowerKw: evMeta.maxPowerKw,
    stationsCount,
    pricePerKwh,
    hasDc: evMeta.hasDc,
    hasAc: evMeta.hasAc,
    connectors: evMeta.connectors,
    connectorPorts: evMeta.connectorPorts,
    chargerStands: evMeta.chargerStands,
  };
}

export async function fetchEvLocations(
  options: FetchLocationsOptions = {},
): Promise<EvLocation[]> {
  const params = new URLSearchParams();
  if (options.all) {
    params.set("all", "1");
  } else if (options.geoId != null) {
    params.set("geo_id", String(options.geoId));
  }
  const query = params.toString();
  const data = await apiFetch<LocationsResponse>(
    `/api/ev/locations${query ? `?${query}` : ""}`,
  );
  return data.locations;
}

export async function fetchEvStations(
  options: FetchLocationsOptions = {},
): Promise<Station[]> {
  const locations = await fetchEvLocations(options);
  return locations.map(toEvStation);
}

export async function fetchEvLocation(id: number | string): Promise<EvLocation> {
  const data = await apiFetch<LocationResponse>(`/api/ev/locations/${id}`);
  return data.location;
}

export async function fetchEvStation(id: number | string): Promise<Station> {
  return toEvStation(await fetchEvLocation(id));
}
