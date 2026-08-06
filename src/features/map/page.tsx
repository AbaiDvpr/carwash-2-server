"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import type { Station, StationKind } from "@/data/stations";
import {
  CONNECTOR_GROUPS,
  connectorLabel,
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import {
  type ChargingCostFilter,
  type ChargingFilters,
  type MapFilters,
  type WashFilters,
  type WashPriceFilter,
  countActiveFilters,
  createDefaultFilters,
  isFilterActive,
  matchesFilters,
  readMapFilters,
  toggleConnector,
  toggleKindEnabled,
  writeMapFilters,
} from "@/features/map/filters";
import { useMapSheetDrag } from "@/features/map/useMapSheetDrag";
import { useStations } from "@/hooks/useStations";
import { useT } from "@/hooks/useT";
import { useUserLocation } from "@/hooks/useUserLocation";
import { distanceKm } from "@/lib/api/geos";
import { compactHoursLabel } from "@/lib/openHours";
import HomeMap from "@/features/home/components/HomeMap";
import MapMarkerStyleDrawer, {
  useMapMarkerStylePrefs,
} from "@/features/map/MapMarkerStyleDrawer";
import "@/features/home/components/map.css";

/** Ближайшие в списке: 0–2 км */
const NEARBY_MAX_KM = 2;
/** Остальные в списке: 2–100 км; дальше — только на карте */
const LIST_MAX_KM = 100;

type StationWithDistance = Station & { distanceKm: number | null };

type FilterOptionKey = "openOnly" | "freeOnly";

const FILTER_SECTIONS: {
  kind: StationKind;
  titleKey: string;
  titleFallback: string;
  options: {
    key: FilterOptionKey;
    labelKey: string;
    labelFallback: string;
  }[];
}[] = [
  {
    kind: "wash",
    titleKey: "common.wash",
    titleFallback: "Мойка",
    options: [
      {
        key: "openOnly",
        labelKey: "map.filter_open_only",
        labelFallback: "Только открытые",
      },
      {
        key: "freeOnly",
        labelKey: "map.filter_free_wash",
        labelFallback: "Есть свободные посты",
      },
    ],
  },
  {
    kind: "charging",
    titleKey: "common.charging",
    titleFallback: "ЭЗС",
    options: [
      {
        key: "openOnly",
        labelKey: "map.filter_open_only",
        labelFallback: "Только открытые",
      },
      {
        key: "freeOnly",
        labelKey: "map.filter_free_charge",
        labelFallback: "Есть свободные слоты",
      },
    ],
  },
];

const COST_OPTIONS: {
  value: ChargingCostFilter;
  labelKey: string;
  labelFallback: string;
}[] = [
  { value: "all", labelKey: "map.filter_cost_all", labelFallback: "Все" },
  { value: "free", labelKey: "map.filter_cost_free", labelFallback: "Бесплатно" },
  { value: "lte70", labelKey: "map.filter_price_lte70", labelFallback: "до 70 ₸/кВт·ч" },
  { value: "lte120", labelKey: "map.filter_price_lte120", labelFallback: "70–120 ₸/кВт·ч" },
  { value: "gt120", labelKey: "map.filter_price_gt120", labelFallback: "от 120 ₸/кВт·ч" },
  {
    value: "unknown",
    labelKey: "map.filter_cost_unknown",
    labelFallback: "Цена неизвестна",
  },
];

const WASH_PRICE_OPTIONS: {
  value: WashPriceFilter;
  labelKey: string;
  labelFallback: string;
}[] = [
  { value: "all", labelKey: "map.filter_cost_all", labelFallback: "Все" },
  { value: "lte1500", labelKey: "map.filter_wash_lte1500", labelFallback: "до 1 500 ₸" },
  { value: "lte3000", labelKey: "map.filter_wash_lte3000", labelFallback: "1 500–3 000 ₸" },
  { value: "gt3000", labelKey: "map.filter_wash_gt3000", labelFallback: "от 3 000 ₸" },
  {
    value: "unknown",
    labelKey: "map.filter_cost_unknown",
    labelFallback: "Цена неизвестна",
  },
];

function FilterSectionLabel({ children }: { children: ReactNode }) {
  return <p className="map-filter-section__label">{children}</p>;
}

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

function parseKind(raw: string | null): StationKind | "all" {
  if (raw === "wash" || raw === "charging") return raw;
  return "all";
}

function matchesSearch(station: Station, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    station.name.toLowerCase().includes(q) ||
    station.address.toLowerCase().includes(q)
  );
}

/** Иконка фильтра: три линии со слайдерами */
function FilterSlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <circle cx="16" cy="6" r="2.25" fill="currentColor" stroke="none" />
      <path d="M4 12h16" />
      <circle cx="8" cy="12" r="2.25" fill="currentColor" stroke="none" />
      <path d="M4 18h16" />
      <circle cx="12" cy="18" r="2.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="map-filter-badge">{count > 9 ? "9+" : count}</span>;
}

/** Снизу рядом с фильтром: быстрый переключатель Мойка / ЭЗС */
function KindSwitcher({
  filters,
  onChange,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}) {
  const t = useT();
  return (
    <div className="map-kind-switch" role="group" aria-label={t("map.filter", "Тип точек")}>
      <button
        type="button"
        className={`map-kind-switch__btn map-kind-switch__btn--wash${filters.wash.enabled ? " is-active" : ""}`}
        onClick={() => onChange(toggleKindEnabled(filters, "wash"))}
        aria-pressed={filters.wash.enabled}
      >
        {t("common.wash", "Мойка")}
      </button>
      <button
        type="button"
        className={`map-kind-switch__btn map-kind-switch__btn--charging${filters.charging.enabled ? " is-active" : ""}`}
        onClick={() => onChange(toggleKindEnabled(filters, "charging"))}
        aria-pressed={filters.charging.enabled}
      >
        {t("common.charging", "ЭЗС")}
      </button>
    </div>
  );
}

function WashFilterExtras({
  draft,
  onChange,
}: {
  draft: WashFilters;
  onChange: (next: WashFilters) => void;
}) {
  const t = useT();

  return (
    <div className="map-filter-section">
      <FilterSectionLabel>
        {t("map.filter_price_wash", "Цена тарифа")}
      </FilterSectionLabel>
      <p className="map-filter-section__hint">
        {t(
          "map.filter_price_wash_hint",
          "По минимальной цене услуги на мойке",
        )}
      </p>
      <div className="map-ev-chips map-ev-chips--wrap">
        {WASH_PRICE_OPTIONS.map((option) => {
          const checked = draft.price === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`map-ev-chip${checked ? " is-on" : ""}`}
              aria-pressed={checked}
              onClick={() => onChange({ ...draft, price: option.value })}
            >
              {t(option.labelKey, option.labelFallback)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`map-filter-acc__chevron${open ? " is-open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AvailabilityRows({
  options,
  values,
  onToggle,
}: {
  options: {
    key: FilterOptionKey;
    labelKey: string;
    labelFallback: string;
  }[];
  values: Record<FilterOptionKey, boolean>;
  onToggle: (key: FilterOptionKey) => void;
}) {
  const t = useT();
  return (
    <div className="map-filter-section map-filter-section--rows">
      <FilterSectionLabel>
        {t("map.filter_availability", "Доступность")}
      </FilterSectionLabel>
      {options.map((option) => {
        const checked = values[option.key];
        return (
          <button
            key={option.key}
            type="button"
            className="map-filter-row"
            onClick={() => onToggle(option.key)}
            aria-pressed={checked}
          >
            <span>{t(option.labelKey, option.labelFallback)}</span>
            <span
              className={`map-filter-sheet__check${checked ? " is-on" : ""}`}
              aria-hidden
            >
              {checked ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
                </svg>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type SpeedAccordionKey = "fast" | "slow";

const SPEED_ACCORDIONS: {
  key: SpeedAccordionKey;
  group: "dc" | "ac";
  titleKey: string;
  titleFallback: string;
  hintKey: string;
  hintFallback: string;
}[] = [
  {
    key: "fast",
    group: "dc",
    titleKey: "map.filter_fast",
    titleFallback: "Быстрые",
    hintKey: "map.filter_fast_hint",
    hintFallback: "DC · обычно от 50 кВт",
  },
  {
    key: "slow",
    group: "ac",
    titleKey: "map.filter_slow",
    titleFallback: "Медленные",
    hintKey: "map.filter_slow_hint",
    hintFallback: "AC · Type 1 / Type 2 и аналоги",
  },
];

function ChargingSpeedFilters({
  draft,
  onChange,
}: {
  draft: ChargingFilters;
  onChange: (next: ChargingFilters) => void;
}) {
  const t = useT();
  const [openKey, setOpenKey] = useState<SpeedAccordionKey | null>("fast");

  return (
    <div className="map-filter-section">
      <FilterSectionLabel>
        {t("map.filter_speed", "Тип зарядки")}
      </FilterSectionLabel>
      <p className="map-filter-section__hint">
        {t(
          "map.filter_speed_hint",
          "Раскройте блок и выберите нужные коннекторы",
        )}
      </p>

      <div className="map-filter-acc-list">
        {SPEED_ACCORDIONS.map((acc) => {
          const group =
            CONNECTOR_GROUPS.find((item) => item.group === acc.group) ?? null;
          const slugs = group?.slugs ?? [];
          const selectedInGroup = slugs.filter((slug) =>
            draft.connectors.includes(slug),
          );
          const activeCount = selectedInGroup.length;
          const open = openKey === acc.key;

          return (
            <div
              key={acc.key}
              className={`map-filter-acc${open ? " is-open" : ""}${activeCount > 0 ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="map-filter-acc__head"
                aria-expanded={open}
                onClick={() =>
                  setOpenKey((prev) => (prev === acc.key ? null : acc.key))
                }
              >
                <span className="map-filter-acc__titles">
                  <span className="map-filter-acc__title">
                    {t(acc.titleKey, acc.titleFallback)}
                  </span>
                  <span className="map-filter-acc__hint">
                    {t(acc.hintKey, acc.hintFallback)}
                  </span>
                </span>
                <span className="map-filter-acc__meta">
                  {activeCount > 0 ? (
                    <span className="map-filter-acc__badge">{activeCount}</span>
                  ) : null}
                  <FilterChevron open={open} />
                </span>
              </button>

              {open ? (
                <div className="map-filter-acc__body">
                  <div className="map-ev-chips map-ev-chips--wrap">
                    {slugs.map((slug) => {
                      const selected = draft.connectors.includes(slug);
                      return (
                        <button
                          key={slug}
                          type="button"
                          className={`map-ev-chip${selected ? " is-on" : ""}`}
                          aria-pressed={selected}
                          onClick={() => onChange(toggleConnector(draft, slug))}
                        >
                          {connectorLabel(slug)}
                        </button>
                      );
                    })}
                  </div>

                  {selectedInGroup.length > 0 ? (
                    <button
                      type="button"
                      className="map-filter-acc__clear"
                      onClick={() =>
                        onChange({
                          ...draft,
                          connectors: draft.connectors.filter(
                            (slug) => !slugs.includes(slug),
                          ),
                        })
                      }
                    >
                      {t("map.filter_clear_group", "Сбросить коннекторы")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChargingPriceFilters({
  draft,
  onChange,
}: {
  draft: ChargingFilters;
  onChange: (next: ChargingFilters) => void;
}) {
  const t = useT();
  return (
    <div className="map-filter-section">
      <FilterSectionLabel>
        {t("map.filter_price_ev", "Цена за кВт·ч")}
      </FilterSectionLabel>
      <div className="map-ev-chips map-ev-chips--wrap">
        {COST_OPTIONS.map((option) => {
          const checked = draft.cost === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`map-ev-chip${checked ? " is-on" : ""}`}
              aria-pressed={checked}
              onClick={() => onChange({ ...draft, cost: option.value })}
            >
              {t(option.labelKey, option.labelFallback)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Drawer: табы Мойка / ЭЗС + пункты фильтрации активного типа */
function MapFilterDrawer({
  filters,
  onChange,
  onClose,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);
  const [draft, setDraft] = useState<MapFilters>(filters);
  const [activeTab, setActiveTab] = useState<StationKind>(() =>
    filters.wash.enabled || !filters.charging.enabled ? "wash" : "charging",
  );
  const {
    sheetStyle,
    handleProps,
    headerProps,
    scrollProps,
    sheetProps,
    offsetY,
    dragging,
    closing,
  } = useMapSheetDrag({
    onClose,
  });

  const activeSection =
    FILTER_SECTIONS.find((section) => section.kind === activeTab) ?? FILTER_SECTIONS[0]!;
  const sectionDraft = draft[activeTab];
  const backdropOpacity = Math.max(
    0.08,
    0.45 * (1 - Math.min(1, offsetY / 260)),
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setDraft(filters);
    setActiveTab(
      filters.wash.enabled || !filters.charging.enabled ? "wash" : "charging",
    );
  }, [filters]);

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
        style={
          offsetY > 0 || closing ? { opacity: backdropOpacity } : undefined
        }
      />
      <div
        className={`map-filter-sheet${dragging || closing ? " is-dragging" : ""}`}
        role="dialog"
        aria-label={t("map.filter", "Фильтр")}
        style={sheetStyle}
        {...sheetProps}
      >
        <div className="map-filter-sheet__header" {...headerProps}>
          <div
            className="map-drawer__grab"
            {...handleProps}
            aria-label={t("map.sheet_drag", "Потяните вниз, чтобы закрыть")}
          >
            <div className="map-drawer__handle" aria-hidden />
          </div>
          <div className="map-filter-sheet__title-row">
            <div className="map-filter-sheet__tabs" role="tablist" aria-label={t("map.filter", "Тип")}>
              {FILTER_SECTIONS.map((section) => (
                <button
                  key={section.kind}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === section.kind}
                  className={`map-filter-sheet__tab map-filter-sheet__tab--${section.kind}${activeTab === section.kind ? " is-active" : ""}`}
                  onClick={() => setActiveTab(section.kind)}
                >
                  {t(section.titleKey, section.titleFallback)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="map-drawer__close"
              onClick={onClose}
              aria-label={t("common.close", "Закрыть")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="map-filter-sheet__body" {...scrollProps}>
          <div className="map-filter-flat">
            {activeTab === "charging" ? (
              <ChargingSpeedFilters
                draft={draft.charging}
                onChange={(charging) => setDraft((prev) => ({ ...prev, charging }))}
              />
            ) : null}

            <AvailabilityRows
              options={activeSection.options}
              values={{
                openOnly: sectionDraft.openOnly,
                freeOnly: sectionDraft.freeOnly,
              }}
              onToggle={(key) =>
                setDraft((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    [key]: !prev[activeTab][key],
                  },
                }))
              }
            />

            {activeTab === "charging" ? (
              <ChargingPriceFilters
                draft={draft.charging}
                onChange={(charging) => setDraft((prev) => ({ ...prev, charging }))}
              />
            ) : null}

            {activeTab === "wash" ? (
              <WashFilterExtras
                draft={draft.wash}
                onChange={(wash) => setDraft((prev) => ({ ...prev, wash }))}
              />
            ) : null}
          </div>
        </div>

        <div className="map-filter-sheet__footer">
          <button
            type="button"
            className="map-filter-sheet__reset"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                [activeTab]:
                  activeTab === "wash"
                    ? { ...createDefaultFilters("all").wash, enabled: prev.wash.enabled }
                    : {
                        ...createDefaultFilters("all").charging,
                        enabled: prev.charging.enabled,
                      },
              }))
            }
          >
            {t("map.filter_reset_tab", "Сбросить")}
          </button>
          <button
            type="button"
            className="map-filter-sheet__apply"
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            {t("map.apply_filter", "Применить")}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function connectorTone(status: string | null | undefined): string {
  if (status === "free") return "is-free";
  if (status === "charging" || status === "busy") return "is-busy";
  return "is-offline";
}

function ListWashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function ListEvIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
    </svg>
  );
}

/** Кол-во станций/постов на точке — как на пине карты */
function stationUnitsCount(station: Station): number {
  if (station.stationsCount != null && station.stationsCount > 0) {
    return station.stationsCount;
  }
  if (station.kind === "charging") {
    return Math.max(1, station.chargerStands?.length ?? 1);
  }
  return Math.max(1, station.washersTotal || 1);
}

function ListTypeMedia({ photoUrl }: { photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!photoUrl || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt="" onError={() => setFailed(true)} />
  );
}

function ListStationPhoto({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <span className="map-ev-card__photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

function listCardTitle(station: Station): string {
  return (station.address || station.name).trim();
}

function ListHoursRow({ hoursLabel }: { hoursLabel: string }) {
  const hours = compactHoursLabel(hoursLabel);
  return (
    <div className="map-ev-card__hours" title={hoursLabel}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
      <span className="map-ev-card__hours-value">{hours}</span>
    </div>
  );
}

function ChargingListCard({
  station,
  onSelect,
}: {
  station: StationWithDistance;
  onSelect: (station: Station) => void;
}) {
  const t = useT();
  const isOpen = station.status === "Открыто";
  const connectors = station.connectors ?? [];
  const visibleConnectors = connectors.slice(0, 4);
  const overflow = connectors.length - visibleConnectors.length;
  const showDc =
    station.hasDc ||
    (station.maxPowerKw != null && station.maxPowerKw >= 50);
  const free = Math.max(0, station.freeSlots);
  const portsTotal = connectors.length;
  const title = listCardTitle(station);
  const hoursLabel =
    station.hoursLabel || t("station.hours_unknown", "Часы уточняйте");

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(station)}
        className="map-ev-card theme-block theme-hover"
      >
        <div className="map-ev-card__head-row">
          <span className="map-ev-card__free-chip">
            {portsTotal > 0 ? `${free}/${portsTotal}` : free}{" "}
            {t("map.free", "свободно")}
          </span>
          <span className={`map-ev-card__status${isOpen ? " is-open" : ""}`}>
            {isOpen
              ? t("map.status_working", "в работе")
              : t("station.closed_short", "Закрыто")}
          </span>
        </div>

        <div className="map-ev-card__top">
          <ListStationPhoto src={station.photoUrl} />
          <div className="map-ev-card__main">
            <div className="map-ev-card__title-row">
              <div className="map-ev-card__title">{title}</div>
              <span
                className="map-ev-card__kind map-ev-card__kind--ev"
                title={t("common.charging", "ЭЗС")}
                aria-label={t("common.charging", "ЭЗС")}
              >
                <ListEvIcon className="map-ev-card__kind-icon" />
              </span>
            </div>
            <ListHoursRow hoursLabel={hoursLabel} />
          </div>
        </div>

        <div className="map-ev-card__types">
          {showDc && station.maxPowerKw != null ? (
            <span className="map-ev-card__type map-ev-card__type--dc">
              <span className="map-ev-card__type-badge">DC</span>
              <span className="map-ev-card__type-label">
                {formatPowerKw(station.maxPowerKw)}
              </span>
            </span>
          ) : null}

          {visibleConnectors.map((connector) => (
            <span
              key={connector.slug}
              className={`map-ev-card__type ${connectorTone(connector.status)}`}
            >
              {connector.photoUrl ? (
                <span className="map-ev-card__type-media" aria-hidden>
                  <ListTypeMedia photoUrl={connector.photoUrl} />
                </span>
              ) : null}
              <span className="map-ev-card__type-label">{connector.label}</span>
            </span>
          ))}

          {overflow > 0 ? (
            <span className="map-ev-card__type map-ev-card__type--more">
              +{overflow}
            </span>
          ) : null}
        </div>

        <div className="map-ev-card__foot">
          <span
            className={`map-ev-card__pill${
              station.pricePerKwh == null ? " is-muted" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 10h18" />
            </svg>
            {formatPricePerKwh(station.pricePerKwh)}
          </span>
          <span className="map-ev-card__pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {station.distanceKm != null
              ? formatDistanceLabel(station.distanceKm)
              : "—"}
          </span>
        </div>
      </button>
    </li>
  );
}

function WashListCard({
  station,
  onSelect,
}: {
  station: StationWithDistance;
  onSelect: (station: Station) => void;
}) {
  const t = useT();
  const isOpen = station.status === "Открыто";
  const free = Math.max(0, station.freeSlots);
  const total = Math.max(station.washersTotal || stationUnitsCount(station), 1);
  const title = listCardTitle(station);
  const hoursLabel =
    station.hoursLabel || t("station.hours_unknown", "Часы уточняйте");

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(station)}
        className="map-ev-card map-ev-card--wash theme-block theme-hover"
      >
        <div className="map-ev-card__head-row">
          <span className="map-ev-card__free-chip">
            {free}/{total} {t("map.free", "свободно")}
          </span>
          <span className={`map-ev-card__status${isOpen ? " is-open" : ""}`}>
            {isOpen
              ? t("map.status_working", "в работе")
              : t("station.closed_short", "Закрыто")}
          </span>
        </div>

        <div className="map-ev-card__top">
          <ListStationPhoto src={station.photoUrl} />
          <div className="map-ev-card__main">
            <div className="map-ev-card__title-row">
              <div className="map-ev-card__title">{title}</div>
              <span
                className="map-ev-card__kind map-ev-card__kind--wash"
                title={t("common.wash", "Мойка")}
                aria-label={t("common.wash", "Мойка")}
              >
                <ListWashIcon className="map-ev-card__kind-icon" />
              </span>
            </div>
            <ListHoursRow hoursLabel={hoursLabel} />
          </div>
        </div>

        <div className="map-ev-card__foot">
          <span className="map-ev-card__pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {station.distanceKm != null
              ? formatDistanceLabel(station.distanceKm)
              : "—"}
          </span>
        </div>
      </button>
    </li>
  );
}

function StationListItem({
  station,
  onSelect,
}: {
  station: StationWithDistance;
  onSelect: (station: Station) => void;
}) {
  if (station.kind === "charging") {
    return <ChargingListCard station={station} onSelect={onSelect} />;
  }
  return <WashListCard station={station} onSelect={onSelect} />;
}

function pointsWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "точка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "точки";
  return "точек";
}

function StationSection({
  title,
  hint,
  stations,
  onSelect,
}: {
  title: string;
  hint?: string;
  stations: StationWithDistance[];
  onSelect: (station: Station) => void;
}) {
  if (stations.length === 0) return null;

  const points = stations.length;

  return (
    <section className="map-list-section">
      <div className="map-list-section__head">
        <div className="map-list-section__title-row">
          <h3 className="map-list-section__title">{title}</h3>
          <span className="map-list-section__count">
            {points} {pointsWord(points)}
          </span>
        </div>
        {hint ? <p className="map-list-section__hint">{hint}</p> : null}
      </div>
      <ul className="map-list-section__items">
        {stations.map((station) => (
          <StationListItem key={station.id} station={station} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

function MapStationList({
  nearby,
  others,
  hasLocation,
  search,
  filterCount,
  loading,
  onSearchChange,
  onSelect,
  onClose,
  onOpenFilter,
  onReload,
}: {
  nearby: StationWithDistance[];
  others: StationWithDistance[];
  hasLocation: boolean;
  search: string;
  filterCount: number;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (station: Station) => void;
  onClose: () => void;
  onOpenFilter: () => void;
  onReload: () => void;
}) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);
  const empty = nearby.length === 0 && others.length === 0;
  const totalPoints = nearby.length + others.length;
  const {
    sheetStyle,
    handleProps,
    headerProps,
    scrollProps,
    sheetProps,
    offsetY,
    dragging,
    closing,
  } = useMapSheetDrag({
    onClose,
  });
  const backdropOpacity = Math.max(
    0.08,
    0.45 * (1 - Math.min(1, offsetY / 260)),
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    onReload();
  }, [onReload]);

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
        style={
          offsetY > 0 || closing ? { opacity: backdropOpacity } : undefined
        }
      />
      <div
        className={`map-list-sheet is-expanded${dragging || closing ? " is-dragging" : ""}`}
        role="dialog"
        aria-label={t("map.list", "Список")}
        style={sheetStyle}
        {...sheetProps}
      >
        <div className="map-list-sheet__header" {...headerProps}>
          <div
            className="map-drawer__grab"
            {...handleProps}
            aria-label={t("map.sheet_drag", "Потяните вниз, чтобы закрыть")}
          >
            <div className="map-drawer__handle" aria-hidden />
          </div>
          <div className="map-list-sheet__title-row">
            <div className="map-list-sheet__heading">
              <p className="map-list-sheet__eyebrow">
                {t("map.list", "Список")}
              </p>
              <h2 className="map-list-sheet__title">
                {t("map.stations_list", "Список станций")}
              </h2>
              {!empty ? (
                <p className="map-list-sheet__summary">
                  {totalPoints} {pointsWord(totalPoints)}
                </p>
              ) : null}
            </div>
            <div className="map-list-sheet__tools">
              <button
                type="button"
                className="map-drawer__close map-drawer__close--badge"
                onClick={onOpenFilter}
                aria-label={t("map.filter", "Фильтр")}
              >
                <FilterSlidersIcon className="h-4 w-4" />
                <FilterCountBadge count={filterCount} />
              </button>
              <button
                type="button"
                className="map-drawer__close"
                onClick={onClose}
                aria-label={t("common.close", "Закрыть")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          <label className="map-list-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("map.search", "Поиск по названию или адресу")}
              autoComplete="off"
            />
          </label>
          {loading ? (
            <p className="map-list-sheet__loading">
              {t("map.updating", "Обновляем данные…")}
            </p>
          ) : null}
        </div>

        <div className="map-list-sheet__scroll" {...scrollProps}>
          {empty ? (
            <p className="map-list-sheet__empty">
              {!hasLocation
                ? t("map.enable_geo", "Включите геолокацию, чтобы увидеть точки в списке")
                : search.trim()
                  ? t("map.not_found", "Ничего не найдено в радиусе 100 км")
                  : t("map.no_points", "В радиусе 100 км пока нет точек")}
            </p>
          ) : (
            <>
              <StationSection
                title={t("map.nearby", "Ближайшие точки")}
                hint={
                  hasLocation
                    ? `0–${NEARBY_MAX_KM} км`
                    : t("map.enable_geo", "Включите геолокацию, чтобы увидеть точки в списке")
                }
                stations={nearby}
                onSelect={onSelect}
              />
              <StationSection
                title={t("map.others", "Остальные")}
                hint={
                  hasLocation
                    ? `${NEARBY_MAX_KM}–${LIST_MAX_KM} км`
                    : undefined
                }
                stations={others}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function MapPageInner() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stations, loading, refreshing, error, reload } = useStations();
  const { location: userLocation } = useUserLocation();

  const kindFromQuery = parseKind(searchParams.get("kind"));
  const focusFromQuery = searchParams.get("station");
  const mapBasePath = pathname.startsWith("/map") ? "/map" : "/";

  const [focusStationId, setFocusStationId] = useState<string | null>(focusFromQuery);
  const [listOpen, setListOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const { prefs: markerPrefs, setPrefs: setMarkerPrefs } = useMapMarkerStylePrefs();
  const [filters, setFilters] = useState<MapFilters>(() => createDefaultFilters("all"));
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [search, setSearch] = useState("");

  /** Пока в URL есть ?kind= — прелоадер: пишем фильтр и сразу чистим query */
  const bootReady = filtersHydrated && kindFromQuery === "all";
  const filterCount = useMemo(() => countActiveFilters(filters), [filters]);

  useEffect(() => {
    if (focusFromQuery) setFocusStationId(focusFromQuery);
  }, [focusFromQuery]);

  useEffect(() => {
    if (kindFromQuery !== "all") {
      const next = createDefaultFilters(kindFromQuery);
      writeMapFilters(next);
      setFilters(next);

      const params = new URLSearchParams(searchParams.toString());
      params.delete("kind");
      const qs = params.toString();
      router.replace(qs ? `${mapBasePath}?${qs}` : mapBasePath, { scroll: false });
      setFiltersHydrated(true);
      return;
    }

    setFilters(readMapFilters() ?? createDefaultFilters("all"));
    setFiltersHydrated(true);
  }, [kindFromQuery, mapBasePath, router, searchParams]);

  useEffect(() => {
    if (!filtersHydrated || kindFromQuery !== "all") return;
    writeMapFilters(filters);
  }, [filters, filtersHydrated, kindFromQuery]);

  const filteredStations = useMemo(
    () => stations.filter((station) => matchesFilters(station, filters)),
    [stations, filters],
  );

  const sortedList = useMemo(() => {
    const withDistance = filteredStations.map((station) => {
      const km = userLocation
        ? distanceKm(
            userLocation.latitude,
            userLocation.longitude,
            station.latitude,
            station.longitude,
          )
        : null;
      return { ...station, distanceKm: km };
    });

    return withDistance
      .filter((station) => matchesSearch(station, search))
      .sort((a, b) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
  }, [filteredStations, userLocation, search]);

  const { nearby, others } = useMemo(() => {
    const near: StationWithDistance[] = [];
    const rest: StationWithDistance[] = [];

    if (!userLocation) {
      return { nearby: near, others: rest };
    }

    for (const station of sortedList) {
      const km = station.distanceKm;
      if (km == null || km > LIST_MAX_KM) continue;
      if (km <= NEARBY_MAX_KM) near.push(station);
      else rest.push(station);
    }

    return { nearby: near, others: rest };
  }, [sortedList, userLocation]);

  if (!bootReady) {
    return (
      <PageLayout title={t("map.title", "Карта")} className="page--map" bare>
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          {t("map.loading", "Загрузка карты…")}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("map.title", "Карта")}
      description={t("map.points", "Точки на карте")}
      className="page--map"
      bare
    >
      <div className="map-screen">
        <HomeMap
          stations={filteredStations}
          loading={loading}
          error={error}
          focusStationId={focusStationId}
          onFocusConsumed={() => setFocusStationId(null)}
          onOpenList={() => setListOpen(true)}
          markerPrefs={markerPrefs}
        />
        <div className="map-bottom-bar">
          <KindSwitcher filters={filters} onChange={setFilters} />
          <button
            type="button"
            className={`map-filter-btn${isFilterActive(filters) ? " is-filtered" : ""}`}
            onClick={() => {
              setListOpen(false);
              setStyleOpen(false);
              setFilterOpen(true);
            }}
            aria-label={t("map.filter", "Фильтр")}
          >
            <FilterSlidersIcon className="map-filter-btn__icon" />
            <span>{t("map.filter", "Фильтр")}</span>
            <FilterCountBadge count={filterCount} />
          </button>
          <button
            type="button"
            className="map-style-btn"
            onClick={() => {
              setListOpen(false);
              setFilterOpen(false);
              setStyleOpen(true);
            }}
            aria-label={t("map.marker_styles", "Вид маркеров")}
            title={t("map.marker_styles", "Вид маркеров")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path
                strokeLinecap="round"
                d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
              />
            </svg>
          </button>
        </div>
      </div>

      {listOpen ? (
        <MapStationList
          nearby={nearby}
          others={others}
          hasLocation={Boolean(userLocation)}
          search={search}
          filterCount={filterCount}
          loading={refreshing || loading}
          onSearchChange={setSearch}
          onReload={reload}
          onClose={() => setListOpen(false)}
          onOpenFilter={() => {
            setListOpen(false);
            setFilterOpen(true);
          }}
          onSelect={(station) => {
            setListOpen(false);
            setFocusStationId(station.id);
          }}
        />
      ) : null}

      {filterOpen ? (
        <MapFilterDrawer
          filters={filters}
          onChange={setFilters}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}

      {styleOpen ? (
        <MapMarkerStyleDrawer
          prefs={markerPrefs}
          onApply={setMarkerPrefs}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}
    </PageLayout>
  );
}

export default function MapPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <PageLayout title={t("map.title", "Карта")} className="page--map" bare>
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            {t("map.loading", "Загрузка карты…")}
          </div>
        </PageLayout>
      }
    >
      <MapPageInner />
    </Suspense>
  );
}
