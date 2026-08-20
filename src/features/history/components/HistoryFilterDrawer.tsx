"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/hooks/useT";
import type { HistoryKindFilter, HistoryPeriodFilter } from "@/lib/api/sessions";
import "./history.css";

export const HISTORY_STATUS_VALUES = [
  "completed",
  "charging",
  "in_progress",
  "pending",
  "cancelled",
  "error",
] as const;

export type HistoryStatusValue = (typeof HISTORY_STATUS_VALUES)[number];

export type HistoryKindTab = "wash" | "charging";

export type HistoryKindFilters = {
  period: HistoryPeriodFilter;
  statuses: HistoryStatusValue[];
};

export type HistoryFiltersState = {
  wash: HistoryKindFilters;
  charging: HistoryKindFilters;
};

export function createDefaultKindFilters(): HistoryKindFilters {
  return { period: "all", statuses: [] };
}

export const DEFAULT_HISTORY_FILTERS: HistoryFiltersState = {
  wash: createDefaultKindFilters(),
  charging: createDefaultKindFilters(),
};

const HISTORY_FILTERS_KEY = "hipoint.history.filters";

const PERIOD_VALUES = new Set<HistoryPeriodFilter>([
  "all",
  "today",
  "yesterday",
  "7d",
  "30d",
]);
const STATUS_SET = new Set<string>(HISTORY_STATUS_VALUES);

export const WASH_STATUSES: HistoryStatusValue[] = [
  "completed",
  "in_progress",
  "pending",
  "cancelled",
  "error",
];

export const CHARGING_STATUSES: HistoryStatusValue[] = [
  "completed",
  "charging",
  "pending",
  "cancelled",
  "error",
];

const WASH_STATUS_SET = new Set<HistoryStatusValue>(WASH_STATUSES);
const CHARGING_STATUS_SET = new Set<HistoryStatusValue>(CHARGING_STATUSES);

function isHistoryStatus(value: unknown): value is HistoryStatusValue {
  return typeof value === "string" && STATUS_SET.has(value);
}

function parseKindFilters(
  raw: unknown,
  allowed: Set<HistoryStatusValue>,
): HistoryKindFilters {
  if (!raw || typeof raw !== "object") return createDefaultKindFilters();
  const parsed = raw as Partial<HistoryKindFilters>;
  const period =
    typeof parsed.period === "string" &&
    PERIOD_VALUES.has(parsed.period as HistoryPeriodFilter)
      ? (parsed.period as HistoryPeriodFilter)
      : "all";
  const statuses = Array.isArray(parsed.statuses)
    ? parsed.statuses
        .filter(
          (item): item is HistoryStatusValue =>
            isHistoryStatus(item) && allowed.has(item),
        )
        .slice(0, 1)
    : [];
  return { period, statuses };
}

export function readHistoryFilters(): HistoryFiltersState {
  if (typeof window === "undefined") return DEFAULT_HISTORY_FILTERS;

  try {
    const raw = window.localStorage.getItem(HISTORY_FILTERS_KEY);
    if (!raw) return DEFAULT_HISTORY_FILTERS;
    const parsed = JSON.parse(raw) as
      | (Partial<HistoryFiltersState> & {
          kind?: HistoryKindFilter;
          period?: HistoryPeriodFilter;
          statuses?: unknown;
        })
      | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_HISTORY_FILTERS;

    if (parsed.wash && typeof parsed.wash === "object") {
      return {
        wash: parseKindFilters(parsed.wash, WASH_STATUS_SET),
        charging: parseKindFilters(parsed.charging, CHARGING_STATUS_SET),
      };
    }

    const period =
      typeof parsed.period === "string" &&
      PERIOD_VALUES.has(parsed.period as HistoryPeriodFilter)
        ? (parsed.period as HistoryPeriodFilter)
        : "all";
    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses.filter(isHistoryStatus).slice(0, 1)
      : [];
    const wash = {
      period,
      statuses: statuses.filter((item) => WASH_STATUS_SET.has(item)),
    };
    const charging = {
      period,
      statuses: statuses.filter((item) => CHARGING_STATUS_SET.has(item)),
    };

    if (parsed.kind === "wash") {
      return { wash, charging: createDefaultKindFilters() };
    }
    if (parsed.kind === "charging") {
      return { wash: createDefaultKindFilters(), charging };
    }
    return { wash, charging };
  } catch {
    return DEFAULT_HISTORY_FILTERS;
  }
}

export function writeHistoryFilters(filters: HistoryFiltersState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // ignore quota / private mode
  }
}

function countKindFilters(filters: HistoryKindFilters): number {
  let count = 0;
  if (filters.period !== "all") count += 1;
  count += filters.statuses.length;
  return count;
}

export function countHistoryFilters(
  filters: HistoryFiltersState,
  kind?: "wash" | "charging",
): number {
  if (kind === "wash") return countKindFilters(filters.wash);
  if (kind === "charging") return countKindFilters(filters.charging);
  return countKindFilters(filters.wash) + countKindFilters(filters.charging);
}

export function historyStatusLabel(
  status: HistoryStatusValue,
  t: ReturnType<typeof useT>,
): string {
  switch (status) {
    case "completed":
      return t("history.status_completed", "Завершено");
    case "charging":
      return t("history.status_charging", "Заряжается");
    case "in_progress":
      return t("history.status_in_progress", "В процессе");
    case "pending":
      return t("history.status_pending", "Ожидает");
    case "cancelled":
      return t("history.status_cancelled", "Отменено");
    case "error":
      return t("history.status_error", "Ошибка");
  }
}

export function historyPeriodLabel(
  period: HistoryPeriodFilter,
  t: ReturnType<typeof useT>,
): string {
  switch (period) {
    case "today":
      return t("history.filter_today", "Сегодня");
    case "yesterday":
      return t("history.filter_yesterday", "Вчера");
    case "7d":
      return t("history.filter_7d", "7 дней");
    case "30d":
      return t("history.filter_30d", "30 дней");
    default:
      return t("history.filter_all", "Все");
  }
}

export function historyKindLabel(
  kind: HistoryKindFilter,
  t: ReturnType<typeof useT>,
): string {
  if (kind === "wash") return t("common.wash", "Мойка");
  if (kind === "charging") return t("common.charging", "ЭЗС");
  return t("history.filter_all", "Все");
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2${
        checked ? " is-on" : ""
      }`}
      aria-hidden
    >
      {checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

type HistoryFilterDrawerProps = {
  value: HistoryFiltersState;
  kind?: "wash" | "charging";
  onApply: (next: HistoryFiltersState) => void;
  onClose: () => void;
};

export default function HistoryFilterDrawer({
  value,
  kind,
  onApply,
  onClose,
}: HistoryFilterDrawerProps) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);
  const [draft, setDraft] = useState<HistoryFiltersState>(value);
  const [activeTab, setActiveTab] = useState<HistoryKindTab>(kind ?? "wash");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const closeAndApply = () => {
    onApply(draftRef.current);
    onClose();
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setDraft(value);
    if (kind) setActiveTab(kind);
  }, [value, kind]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndApply();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onApply, onClose]);

  const tabs: HistoryKindTab[] = kind ? [kind] : ["wash", "charging"];

  const periodOptions: { value: HistoryPeriodFilter; label: string }[] = [
    { value: "all", label: t("history.filter_all", "Все") },
    { value: "today", label: t("history.filter_today", "Сегодня") },
    { value: "yesterday", label: t("history.filter_yesterday", "Вчера") },
    { value: "7d", label: t("history.filter_7d", "7 дней") },
    { value: "30d", label: t("history.filter_30d", "30 дней") },
  ];

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="history-drawer__backdrop"
        onClick={closeAndApply}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="history-drawer history-drawer--filter"
        role="dialog"
        aria-modal="true"
        aria-label={t("history.filter", "Фильтр")}
      >
        <div className="history-drawer__header">
          <div className="history-drawer__title-row">
            <h2 className="history-drawer__title">
              {t("history.filter", "Фильтр")}
            </h2>
            <button
              type="button"
              className="app-drawer-close"
              onClick={closeAndApply}
              aria-label={t("common.close", "Закрыть")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {!kind ? (
            <div
              className="history-kind"
              role="tablist"
              aria-label={t("history.filter_type", "Тип")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "wash"}
                className={`history-kind__btn${activeTab === "wash" ? " is-on" : ""}`}
                onClick={() => setActiveTab("wash")}
              >
                {t("common.wash", "Мойка")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "charging"}
                className={`history-kind__btn${activeTab === "charging" ? " is-on" : ""}`}
                onClick={() => setActiveTab("charging")}
              >
                {t("common.charging", "ЭЗС")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="history-drawer__body">
          <div className="history-filter-stack">
            {tabs.map((tab) => {
              const tabSection = draft[tab];
              const statusOptions = tab === "charging" ? CHARGING_STATUSES : WASH_STATUSES;
              return (
                <div
                  key={tab}
                  className={`history-filter-pane${activeTab === tab ? " is-on" : ""}`}
                  aria-hidden={activeTab !== tab}
                >
                  <section className="history-filter-section history-filter-section--rows">
                    <p className="history-filter-section__label">
                      {t("history.filter_period", "Период")}
                    </p>
                    <div role="radiogroup" aria-label={t("history.filter_period", "Период")}>
                      {periodOptions.map((option) => {
                        const on = tabSection.period === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className="history-filter-row"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                [tab]: { ...prev[tab], period: option.value },
                              }))
                            }
                          >
                            <RadioMark checked={on} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="history-filter-section history-filter-section--rows">
                    <p className="history-filter-section__label">
                      {t("history.filter_status", "Статус")}
                    </p>
                    <div role="radiogroup" aria-label={t("history.filter_status", "Статус")}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={tabSection.statuses.length === 0}
                        className="history-filter-row"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            [tab]: { ...prev[tab], statuses: [] },
                          }))
                        }
                      >
                        <RadioMark checked={tabSection.statuses.length === 0} />
                        <span>{t("history.filter_all", "Все")}</span>
                      </button>
                      {statusOptions.map((status) => {
                        const on = tabSection.statuses[0] === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className="history-filter-row"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                [tab]: { ...prev[tab], statuses: [status] },
                              }))
                            }
                          >
                            <RadioMark checked={on} />
                            <span>{historyStatusLabel(status, t)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              );
            })}
          </div>

          <div className="history-drawer__reset-wrap">
            <button
              type="button"
              className="history-drawer__reset"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  [activeTab]: createDefaultKindFilters(),
                }))
              }
            >
              {t("history.filter_reset", "Сбросить")}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

