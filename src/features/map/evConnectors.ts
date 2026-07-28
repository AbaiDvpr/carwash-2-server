/** Справочник коннекторов ЭЗС для фильтров и списка */

export type ConnectorSlug =
  | "ccs2"
  | "ccs1"
  | "chademo"
  | "gbt_dc"
  | "type2"
  | "type1"
  | "gbt_ac"
  | "tesla_us"
  | "blue_16"
  | "red_16"
  | "red_32"
  | "schuko"
  | "other";

export type ConnectorSpeed = "dc" | "ac" | "outlet" | "other";

export type ConnectorDef = {
  slug: ConnectorSlug;
  label: string;
  group: ConnectorSpeed;
};

export const CONNECTOR_CATALOG: ConnectorDef[] = [
  { slug: "ccs2", label: "CCS 2", group: "dc" },
  { slug: "chademo", label: "CHAdeMO", group: "dc" },
  { slug: "gbt_dc", label: "GB/T DC", group: "dc" },
  { slug: "ccs1", label: "CCS 1", group: "dc" },
  { slug: "type2", label: "Type 2", group: "ac" },
  { slug: "type1", label: "Type 1", group: "ac" },
  { slug: "gbt_ac", label: "GB/T AC", group: "ac" },
  { slug: "tesla_us", label: "Tesla US", group: "ac" },
  { slug: "blue_16", label: "Синяя 16А", group: "outlet" },
  { slug: "red_16", label: "Красная 16А", group: "outlet" },
  { slug: "red_32", label: "Красная 32А", group: "outlet" },
  { slug: "schuko", label: "Schuko", group: "outlet" },
];

export const CONNECTOR_GROUPS: {
  group: ConnectorSpeed;
  titleKey: string;
  titleFallback: string;
  slugs: ConnectorSlug[];
}[] = [
  {
    group: "dc",
    titleKey: "map.filter_connectors_dc",
    titleFallback: "Быстрые (DC)",
    slugs: ["ccs2", "chademo", "gbt_dc", "ccs1"],
  },
  {
    group: "ac",
    titleKey: "map.filter_connectors_ac",
    titleFallback: "Медленные (AC)",
    slugs: ["type2", "type1", "gbt_ac", "tesla_us"],
  },
  {
    group: "outlet",
    titleKey: "map.filter_connectors_outlet",
    titleFallback: "Розетки",
    slugs: ["blue_16", "red_16", "red_32", "schuko"],
  },
];

const LABEL_BY_SLUG = Object.fromEntries(
  CONNECTOR_CATALOG.map((item) => [item.slug, item.label]),
) as Record<ConnectorSlug, string>;

/** Порог «быстрой» зарядки, кВт */
export const FAST_POWER_KW = 50;
export const POWER_MAX_CAP = 300;

export function connectorLabel(slug: string): string {
  return LABEL_BY_SLUG[slug as ConnectorSlug] ?? slug;
}

/** Нормализация сырого type из API → slug */
export function normalizeConnectorType(
  raw: string | null | undefined,
): ConnectorSlug {
  if (!raw) return "other";
  const s = raw.toLowerCase().replace(/[\s/_-]+/g, "");

  if (s.includes("chademo")) return "chademo";
  if (s.includes("ccs2") || s.includes("combo2") || s === "ccs") return "ccs2";
  if (s.includes("ccs1") || s.includes("combo1")) return "ccs1";
  if (
    (s.includes("gbt") || s.includes("gb/t") || s.includes("guobiao")) &&
    (s.includes("dc") || s.includes("fast"))
  ) {
    return "gbt_dc";
  }
  if (s.includes("gbtdc")) return "gbt_dc";
  if (
    (s.includes("gbt") || s.includes("guobiao")) &&
    (s.includes("ac") || !s.includes("dc"))
  ) {
    return "gbt_ac";
  }
  if (s.includes("gbtac")) return "gbt_ac";
  if (s.includes("type2") || s.includes("mennekes") || s.includes("iec62196")) {
    return "type2";
  }
  if (s.includes("type1") || s.includes("j1772")) return "type1";
  if (s.includes("tesla") || s.includes("nacs")) return "tesla_us";
  if (s.includes("schuko") || s.includes("cee7")) return "schuko";
  if (s.includes("blue") && s.includes("16")) return "blue_16";
  if (s.includes("red") && s.includes("32")) return "red_32";
  if (s.includes("red") && s.includes("16")) return "red_16";
  if (s.includes("dc")) return "ccs2";
  if (s.includes("ac")) return "type2";

  return "other";
}

export function isDcSlug(slug: ConnectorSlug): boolean {
  return CONNECTOR_CATALOG.find((c) => c.slug === slug)?.group === "dc";
}

export function isAcSlug(slug: ConnectorSlug): boolean {
  const group = CONNECTOR_CATALOG.find((c) => c.slug === slug)?.group;
  return group === "ac" || group === "outlet";
}

export function parsePricePerKwh(
  value: number | string | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatPricePerKwh(price: number | null | undefined): string {
  if (price == null) return "—";
  if (price === 0) return "Бесплатно";
  const formatted = Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted} ₸/кВт·ч`;
}

export function formatPowerKw(power: number | null | undefined): string {
  if (power == null) return "—";
  if (power >= POWER_MAX_CAP) return `${POWER_MAX_CAP}+ кВт`;
  return `${Math.round(power)} кВт`;
}
