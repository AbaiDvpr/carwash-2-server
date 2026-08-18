import type { Station, StationKind } from "@/data/stations";
import {
  CONNECTOR_CATALOG,
  type ConnectorSlug,
} from "@/features/map/evConnectors";

/** Цена мойки по мин. тарифу (₸ за услугу) */
export type WashPriceFilter =
  | "all"
  | "lte1500"
  | "lte3000"
  | "gt3000";

/** Цена ЭЗС за кВт·ч (₸) */
export type ChargingCostFilter =
  | "all"
  | "lte70"
  | "lte120"
  | "gt120";

export type WashFilters = {
  enabled: boolean;
  openOnly: boolean;
  freeOnly: boolean;
  price: WashPriceFilter;
};

export type ChargingFilters = {
  enabled: boolean;
  openOnly: boolean;
  freeOnly: boolean;
  /** Пусто = все коннекторы */
  connectors: ConnectorSlug[];
  cost: ChargingCostFilter;
};

export type MapFilters = {
  wash: WashFilters;
  charging: ChargingFilters;
};

export const DEFAULT_WASH_FILTERS: WashFilters = {
  enabled: true,
  openOnly: true,
  freeOnly: false,
  price: "all",
};

export const DEFAULT_CHARGING_FILTERS: ChargingFilters = {
  enabled: true,
  openOnly: true,
  freeOnly: false,
  connectors: [],
  cost: "all",
};

export function createDefaultFilters(kind: StationKind | "all" = "all"): MapFilters {
  if (kind === "wash") {
    return {
      wash: { ...DEFAULT_WASH_FILTERS, enabled: true },
      charging: { ...DEFAULT_CHARGING_FILTERS, enabled: false },
    };
  }
  if (kind === "charging") {
    return {
      wash: { ...DEFAULT_WASH_FILTERS, enabled: false },
      charging: { ...DEFAULT_CHARGING_FILTERS, enabled: true },
    };
  }
  return {
    wash: { ...DEFAULT_WASH_FILTERS },
    charging: { ...DEFAULT_CHARGING_FILTERS },
  };
}

/** Минимальная цена тарифа мойки; null — тарифов нет */
export function stationMinTariffPrice(station: Station): number | null {
  const prices = (station.tariff ?? [])
    .map((item) => item.price)
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function matchesWashPrice(station: Station, price: WashPriceFilter): boolean {
  if (price === "all") return true;
  const min = stationMinTariffPrice(station);
  if (min == null) return false;
  if (price === "lte1500") return min <= 1500;
  if (price === "lte3000") return min > 1500 && min <= 3000;
  if (price === "gt3000") return min > 3000;
  return true;
}

function matchesChargingCost(
  station: Station,
  cost: ChargingCostFilter,
): boolean {
  if (cost === "all") return true;
  const price = station.pricePerKwh;
  if (price == null) return false;
  if (cost === "lte70") return price > 0 && price <= 70;
  if (cost === "lte120") return price > 70 && price <= 120;
  if (cost === "gt120") return price > 120;
  return true;
}

function matchesChargingExtras(
  station: Station,
  filters: ChargingFilters,
): boolean {
  if (filters.connectors.length > 0) {
    const slugs = new Set((station.connectors ?? []).map((c) => c.slug));
    if (!filters.connectors.some((slug) => slugs.has(slug))) return false;
  }

  return matchesChargingCost(station, filters.cost);
}

export function matchesFilters(station: Station, filters: MapFilters): boolean {
  // На карте только открытые точки. ЭЗС с 0 свободных пистолетов — «Занято», не показываем.
  if (station.status !== "Открыто") return false;
  if (station.kind === "charging" && station.freeSlots <= 0) return false;

  if (station.kind === "wash") {
    const options = filters.wash;
    if (!options.enabled) return false;
    return matchesWashPrice(station, options.price);
  }

  const options = filters.charging;
  if (!options.enabled) return false;
  return matchesChargingExtras(station, options);
}

/** Сколько «активных» отличий от дефолта (для badge) */
export function countActiveFilters(filters: MapFilters): number {
  const defaults = createDefaultFilters("all");
  let count = 0;

  if (filters.wash.enabled !== defaults.wash.enabled) count += 1;
  if (filters.charging.enabled !== defaults.charging.enabled) count += 1;
  if (filters.wash.price !== "all") count += 1;
  if (filters.charging.connectors.length > 0) count += 1;
  if (filters.charging.cost !== "all") count += 1;

  return count;
}

export function isFilterActive(filters: MapFilters): boolean {
  return countActiveFilters(filters) > 0;
}

export function toggleKindEnabled(
  prev: MapFilters,
  kind: StationKind,
): MapFilters {
  const next = {
    ...prev,
    [kind]: { ...prev[kind], enabled: !prev[kind].enabled },
  };
  if (!next.wash.enabled && !next.charging.enabled) return prev;
  return next;
}

export function toggleConnector(
  prev: ChargingFilters,
  slug: ConnectorSlug,
): ChargingFilters {
  const has = prev.connectors.includes(slug);
  return {
    ...prev,
    connectors: has
      ? prev.connectors.filter((item) => item !== slug)
      : [...prev.connectors, slug],
  };
}

/** Выбор табов Мойка/ЭЗС и остальные фильтры карты */
export const MAP_FILTERS_STORAGE_KEY = "map_filters";

const CONNECTOR_SLUGS = new Set<string>(
  CONNECTOR_CATALOG.map((item) => item.slug),
);

const WASH_PRICES = new Set<string>([
  "all",
  "lte1500",
  "lte3000",
  "gt3000",
]);

const CHARGING_COSTS = new Set<string>([
  "all",
  "lte70",
  "lte120",
  "gt120",
]);

function parseWashFilters(raw: unknown): WashFilters | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const price = value.price === "unknown" ? "all" : value.price;
  if (typeof price !== "string" || !WASH_PRICES.has(price)) return null;
  if (typeof value.enabled !== "boolean") return null;
  if (typeof value.openOnly !== "boolean") return null;
  if (typeof value.freeOnly !== "boolean") return null;
  return {
    enabled: value.enabled,
    openOnly: value.openOnly,
    freeOnly: value.freeOnly,
    price: price as WashPriceFilter,
  };
}

function parseChargingFilters(raw: unknown): ChargingFilters | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const cost =
    value.cost === "unknown" || value.cost === "free" ? "all" : value.cost;
  if (typeof cost !== "string" || !CHARGING_COSTS.has(cost)) return null;
  if (typeof value.enabled !== "boolean") return null;
  if (typeof value.openOnly !== "boolean") return null;
  if (typeof value.freeOnly !== "boolean") return null;
  if (!Array.isArray(value.connectors)) return null;
  const connectors = value.connectors.filter(
    (slug): slug is ConnectorSlug =>
      typeof slug === "string" && CONNECTOR_SLUGS.has(slug),
  );
  return {
    enabled: value.enabled,
    openOnly: value.openOnly,
    freeOnly: value.freeOnly,
    connectors,
    cost: cost as ChargingCostFilter,
  };
}

export function parseMapFilters(raw: string | null): MapFilters | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Record<string, unknown>;
    const wash = parseWashFilters(value.wash);
    const charging = parseChargingFilters(value.charging);
    if (!wash || !charging) return null;
    if (!wash.enabled && !charging.enabled) return null;
    return { wash, charging };
  } catch {
    return null;
  }
}

export function readMapFilters(): MapFilters | null {
  if (typeof window === "undefined") return null;
  return parseMapFilters(window.localStorage.getItem(MAP_FILTERS_STORAGE_KEY));
}

export function writeMapFilters(filters: MapFilters): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MAP_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

/** URL `?kind=` имеет приоритет; иначе — сохранённые фильтры. */
export function resolveMapFilters(
  kindFromQuery: StationKind | "all",
  stored: MapFilters | null,
): MapFilters {
  if (kindFromQuery !== "all") {
    return createDefaultFilters(kindFromQuery);
  }
  return stored ?? createDefaultFilters("all");
}
