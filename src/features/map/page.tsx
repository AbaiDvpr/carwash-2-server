"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import type { Station, StationKind } from "@/data/stations";
import {
  CONNECTOR_CATALOG,
  formatPowerKw,
  formatPricePerKwh,
} from "@/features/map/evConnectors";
import {
  type ChargingCostFilter,
  type ChargingFilters,
  type MapFilters,
  countActiveFilters,
  createDefaultFilters,
  isFilterActive,
  matchesFilters,
  toggleConnector,
  toggleKindEnabled,
} from "@/features/map/filters";
import { useStations } from "@/hooks/useStations";
import { useT } from "@/hooks/useT";
import { useUserLocation } from "@/hooks/useUserLocation";
import { distanceKm } from "@/lib/api/geos";
import HomeMap from "@/features/home/components/HomeMap";
import "@/features/home/components/map.css";

/** Ближайшие в списке: 0–10 км */
const NEARBY_MAX_KM = 10;
/** В списке только до 100 км; дальше — только на карте */
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
  { value: "paid", labelKey: "map.filter_cost_paid", labelFallback: "Платные" },
  { value: "free", labelKey: "map.filter_cost_free", labelFallback: "Бесплатные" },
  {
    value: "unknown",
    labelKey: "map.filter_cost_unknown",
    labelFallback: "Неизвестно",
  },
];

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

function ChargingFilterExtras({
  draft,
  disabled,
  onChange,
}: {
  draft: ChargingFilters;
  disabled: boolean;
  onChange: (next: ChargingFilters) => void;
}) {
  const t = useT();

  return (
    <div className={`map-ev-filters${disabled ? " is-disabled" : ""}`}>
      <div className="map-ev-chips">
        <button
          type="button"
          className={`map-ev-chip${draft.fast ? " is-on" : ""}`}
          disabled={disabled}
          aria-pressed={draft.fast}
          onClick={() => onChange({ ...draft, fast: !draft.fast })}
        >
          {t("map.filter_fast", "Быстрые")}
        </button>
        <button
          type="button"
          className={`map-ev-chip${draft.slow ? " is-on" : ""}`}
          disabled={disabled}
          aria-pressed={draft.slow}
          onClick={() => onChange({ ...draft, slow: !draft.slow })}
        >
          {t("map.filter_slow", "Медленные")}
        </button>
      </div>

      <div className="map-ev-chips map-ev-chips--wrap">
        {CONNECTOR_CATALOG.map((item) => {
          const selected = draft.connectors.includes(item.slug);
          return (
            <button
              key={item.slug}
              type="button"
              className={`map-ev-chip${selected ? " is-on" : ""}`}
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(toggleConnector(draft, item.slug))}
            >
              {item.label}
            </button>
          );
        })}
        {draft.connectors.length > 0 ? (
          <button
            type="button"
            className="map-ev-chip map-ev-chip--ghost"
            disabled={disabled}
            onClick={() => onChange({ ...draft, connectors: [] })}
          >
            {t("map.filter_clear_all", "Сброс")}
          </button>
        ) : null}
      </div>

      <div className="map-ev-chips map-ev-chips--wrap">
        {COST_OPTIONS.map((option) => {
          const checked = draft.cost === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`map-ev-chip${checked ? " is-on" : ""}`}
              disabled={disabled}
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

  const activeSection =
    FILTER_SECTIONS.find((section) => section.kind === activeTab) ?? FILTER_SECTIONS[0]!;
  const sectionDraft = draft[activeTab];

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
      />
      <div className="map-filter-sheet" role="dialog" aria-label={t("map.filter", "Фильтр")}>
        <div className="map-filter-sheet__header">
          <div className="map-drawer__handle" aria-hidden />
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

        <div className="map-filter-sheet__body">
          <div className="map-filter-flat">
            {activeSection.options.map((option) => {
              const checked = sectionDraft[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  className="map-filter-row"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        [option.key]: !prev[activeTab][option.key],
                      },
                    }))
                  }
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

            {activeTab === "charging" ? (
              <ChargingFilterExtras
                draft={draft.charging}
                disabled={false}
                onChange={(charging) => setDraft((prev) => ({ ...prev, charging }))}
              />
            ) : null}
          </div>
        </div>

        <div className="map-filter-sheet__footer">
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
  if (status === "busy") return "is-busy";
  return "is-offline";
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
  const visible = connectors.slice(0, 4);
  const overflow = connectors.length - visible.length;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(station)}
        className="map-ev-card theme-block theme-hover"
      >
        <div className="map-ev-card__head">
          <span className={`map-ev-card__status${isOpen ? " is-open" : ""}`}>
            {isOpen
              ? t("station.open_short", "в работе")
              : t("station.closed_short", "закрыто")}
          </span>
          <svg className="map-ev-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" d="m9 6 6 6-6 6" />
          </svg>
        </div>

        <div className="map-ev-card__title">{station.name}</div>
        <div className="map-ev-card__meta">
          {station.freeSlots}/{station.washersTotal} {t("map.free", "свободно")}
          {station.maxPowerKw != null
            ? ` · max ${formatPowerKw(station.maxPowerKw)}`
            : null}
        </div>

        {visible.length > 0 ? (
          <div className="map-ev-card__connectors">
            {visible.map((connector) => (
              <span
                key={connector.slug}
                className={`map-ev-card__chip ${connectorTone(connector.status)}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                </svg>
                <span className="map-ev-card__chip-label">
                  {connector.powerKw != null
                    ? `${connector.label} · ${Math.round(connector.powerKw)} кВт`
                    : connector.label}
                </span>
              </span>
            ))}
            {overflow > 0 ? (
              <span className="map-ev-card__chip is-more">+{overflow}</span>
            ) : null}
          </div>
        ) : null}

        <div className="map-ev-card__foot">
          <span>{formatPricePerKwh(station.pricePerKwh)}</span>
          <span>
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
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(station)}
        className="app-section theme-hover flex w-full items-start gap-3 text-left"
        style={{ padding: "var(--app-row-pad-y) var(--app-row-pad-x)" }}
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: "#38bdf8" }}
        >
          <svg className="h-4 w-4" viewBox="0 0 792 792" fill="currentColor" aria-hidden>
            <path d="M665.335,486.777c-7.815-46.161-25.534-88.323-43.162-126.578C569.197,243.434,505.408,137.391,442.619,39.255 l-7.815-13.721C423.991,8.814,411.269,0,396.549,0c-21.626,0-35.347,19.627-39.255,25.534c0,0,0,0,0,1L343.573,48.16 c-24.534,39.255-50.068,80.508-74.602,121.671C230.716,234.62,182.647,320.944,147.3,413.174 c-11.813,30.441-22.535,60.881-23.535,94.229c-3.907,86.324,27.442,159.018,92.23,215.901C266.063,767.466,329.852,792,395.549,792 l0,0c96.138,0,183.552-49.068,233.529-132.485C662.427,604.541,675.148,545.659,665.335,486.777z M597.638,640.888 c-43.162,72.603-118.764,114.765-202.18,114.765c-56.883,0-112.857-20.627-156.019-58.882 c-55.974-49.068-83.416-112.857-80.508-187.459c1-27.442,9.814-53.975,21.626-82.417c34.348-90.322,81.417-174.647,118.764-238.436 c23.535-40.254,49.068-81.417,74.602-120.672l12.721-20.627c0-1,1-1,1-1.999c1.999-2.908,5.906-7.815,7.815-8.814 c0,0,2.908,1,7.815,8.814l7.815,12.721c60.881,96.138,124.67,201.18,176.646,316.037c16.72,37.256,33.348,76.51,40.254,117.764 C637.893,542.751,627.079,592.728,597.638,640.888z M413.087,662.423c0,9.814-7.815,17.628-17.628,17.628 c-89.323,0-160.926-72.603-160.926-160.926c0-9.814,7.815-17.628,17.628-17.628c9.814,0,17.628,7.815,17.628,17.628 c0.999,68.696,56.974,124.67,125.669,124.67C405.272,643.795,413.087,652.609,413.087,662.423z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "var(--app-text)" }}
            >
              {station.name}
            </span>
            {station.distanceKm != null ? (
              <span className="theme-description shrink-0 text-[11px] font-medium">
                {formatDistanceLabel(station.distanceKm)}
              </span>
            ) : null}
          </span>
          <span className="theme-description mt-0.5 block truncate text-xs">
            {station.address}
          </span>
          <span className="theme-description mt-1 block text-[11px]">
            {t("common.wash", "Мойка")} · {station.freeSlots}/{station.washersTotal}{" "}
            {t("map.free", "свободно")}
          </span>
        </span>
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

  return (
    <section className="map-list-section">
      <div className="map-list-section__head">
        <h3 className="map-list-section__title">{title}</h3>
        {hint ? <p className="map-list-section__hint">{hint}</p> : null}
      </div>
      <ul className="space-y-2">
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
  onSearchChange,
  onSelect,
  onClose,
  onOpenFilter,
}: {
  nearby: StationWithDistance[];
  others: StationWithDistance[];
  hasLocation: boolean;
  search: string;
  filterCount: number;
  onSearchChange: (value: string) => void;
  onSelect: (station: Station) => void;
  onClose: () => void;
  onOpenFilter: () => void;
}) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);
  const empty = nearby.length === 0 && others.length === 0;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div className="map-list-sheet" role="dialog" aria-label={t("map.list", "Список")}>
        <div className="map-list-sheet__header">
          <div className="map-drawer__handle" aria-hidden />
          <div className="map-list-sheet__title-row">
            <div>
              <p className="theme-description text-[11px] font-medium uppercase tracking-wider">
                {t("map.list", "Список")}
              </p>
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--app-text)" }}
              >
                {t("map.points", "Точки на карте")}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
        </div>

        <div className="map-list-sheet__scroll">
          {empty ? (
            <p className="theme-description px-1 py-8 text-center text-xs">
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
  const searchParams = useSearchParams();
  const { stations, loading, error } = useStations();
  const { location: userLocation } = useUserLocation();

  const kindFromQuery = parseKind(searchParams.get("kind"));
  const focusFromQuery = searchParams.get("station");

  const [focusStationId, setFocusStationId] = useState<string | null>(focusFromQuery);
  const [listOpen, setListOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(() => createDefaultFilters(kindFromQuery));
  const [search, setSearch] = useState("");

  const filterCount = useMemo(() => countActiveFilters(filters), [filters]);

  useEffect(() => {
    if (focusFromQuery) setFocusStationId(focusFromQuery);
  }, [focusFromQuery]);

  useEffect(() => {
    setFilters(createDefaultFilters(kindFromQuery));
  }, [kindFromQuery]);

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
          onClose={() => router.push("/")}
          onOpenList={() => setListOpen(true)}
        />
        <div className="map-bottom-bar">
          <KindSwitcher filters={filters} onChange={setFilters} />
          <button
            type="button"
            className={`map-filter-btn${isFilterActive(filters) ? " is-filtered" : ""}`}
            onClick={() => {
              setListOpen(false);
              setFilterOpen(true);
            }}
            aria-label={t("map.filter", "Фильтр")}
          >
            <FilterSlidersIcon className="map-filter-btn__icon" />
            <span>{t("map.filter", "Фильтр")}</span>
            <FilterCountBadge count={filterCount} />
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
          onSearchChange={setSearch}
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
