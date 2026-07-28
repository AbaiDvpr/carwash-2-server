import type { Station, StationKind } from "@/data/stations";
import {
  FAST_POWER_KW,
  isAcSlug,
  isDcSlug,
  type ConnectorSlug,
} from "@/features/map/evConnectors";

export type WashFilters = {
  enabled: boolean;
  openOnly: boolean;
  freeOnly: boolean;
};

export type ChargingCostFilter = "all" | "paid" | "free" | "unknown";

export type ChargingFilters = WashFilters & {
  /** Быстрые (DC / ≥50 кВт) */
  fast: boolean;
  /** Медленные (AC / <50 кВт) */
  slow: boolean;
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
  openOnly: false,
  freeOnly: false,
};

export const DEFAULT_CHARGING_FILTERS: ChargingFilters = {
  enabled: true,
  openOnly: false,
  freeOnly: false,
  fast: false,
  slow: false,
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

function stationHasFast(station: Station): boolean {
  if (station.hasDc) return true;
  if (station.maxPowerKw != null && station.maxPowerKw >= FAST_POWER_KW) {
    return true;
  }
  return (station.connectors ?? []).some((c) => isDcSlug(c.slug as ConnectorSlug));
}

function stationHasSlow(station: Station): boolean {
  if (station.hasAc) return true;
  if (station.maxPowerKw != null && station.maxPowerKw < FAST_POWER_KW) {
    return true;
  }
  return (station.connectors ?? []).some((c) => isAcSlug(c.slug as ConnectorSlug));
}

function matchesChargingExtras(
  station: Station,
  filters: ChargingFilters,
): boolean {
  if (filters.fast || filters.slow) {
    const okFast = filters.fast && stationHasFast(station);
    const okSlow = filters.slow && stationHasSlow(station);
    if (!okFast && !okSlow) return false;
  }

  if (filters.connectors.length > 0) {
    const slugs = new Set((station.connectors ?? []).map((c) => c.slug));
    if (!filters.connectors.some((slug) => slugs.has(slug))) return false;
  }

  if (filters.cost !== "all") {
    const price = station.pricePerKwh;
    if (filters.cost === "free" && price !== 0) return false;
    if (filters.cost === "paid" && (price == null || price <= 0)) return false;
    if (filters.cost === "unknown" && price != null) return false;
  }

  return true;
}

export function matchesFilters(station: Station, filters: MapFilters): boolean {
  if (station.kind === "wash") {
    const options = filters.wash;
    if (!options.enabled) return false;
    if (options.openOnly && station.status !== "Открыто") return false;
    if (options.freeOnly && station.freeSlots <= 0) return false;
    return true;
  }

  const options = filters.charging;
  if (!options.enabled) return false;
  if (options.openOnly && station.status !== "Открыто") return false;
  if (options.freeOnly && station.freeSlots <= 0) return false;
  return matchesChargingExtras(station, options);
}

/** Сколько «активных» отличий от дефолта (для badge) */
export function countActiveFilters(filters: MapFilters): number {
  const defaults = createDefaultFilters("all");
  let count = 0;

  if (filters.wash.enabled !== defaults.wash.enabled) count += 1;
  if (filters.charging.enabled !== defaults.charging.enabled) count += 1;
  if (filters.wash.openOnly) count += 1;
  if (filters.wash.freeOnly) count += 1;
  if (filters.charging.openOnly) count += 1;
  if (filters.charging.freeOnly) count += 1;
  if (filters.charging.fast) count += 1;
  if (filters.charging.slow) count += 1;
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
