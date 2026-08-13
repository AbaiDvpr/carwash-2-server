"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/hooks/useT";
import type { HistoryKindFilter, HistoryPeriodFilter } from "@/lib/api/sessions";
import "./history.css";

export const HISTORY_STATUS_VALUES = [
  "completed",
  "in_progress",
  "pending",
  "cancelled",
  "error",
] as const;

export type HistoryStatusValue = (typeof HISTORY_STATUS_VALUES)[number];

export type HistoryFiltersState = {
  kind: HistoryKindFilter;
  period: HistoryPeriodFilter;
  statuses: HistoryStatusValue[];
};

export const DEFAULT_HISTORY_FILTERS: HistoryFiltersState = {
  kind: "all",
  period: "all",
  statuses: [],
};

const HISTORY_FILTERS_KEY = "hipoint.history.filters";

const KIND_VALUES = new Set<HistoryKindFilter>(["all", "wash", "charging"]);
const PERIOD_VALUES = new Set<HistoryPeriodFilter>([
  "all",
  "today",
  "yesterday",
  "7d",
  "30d",
]);
const STATUS_SET = new Set<string>(HISTORY_STATUS_VALUES);

function isHistoryStatus(value: unknown): value is HistoryStatusValue {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function readHistoryFilters(): HistoryFiltersState {
  if (typeof window === "undefined") return DEFAULT_HISTORY_FILTERS;

  try {
    const raw = window.localStorage.getItem(HISTORY_FILTERS_KEY);
    if (!raw) return DEFAULT_HISTORY_FILTERS;
    const parsed = JSON.parse(raw) as Partial<HistoryFiltersState> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_HISTORY_FILTERS;

    const kind =
      typeof parsed.kind === "string" && KIND_VALUES.has(parsed.kind as HistoryKindFilter)
        ? (parsed.kind as HistoryKindFilter)
        : DEFAULT_HISTORY_FILTERS.kind;
    const period =
      typeof parsed.period === "string" &&
      PERIOD_VALUES.has(parsed.period as HistoryPeriodFilter)
        ? (parsed.period as HistoryPeriodFilter)
        : DEFAULT_HISTORY_FILTERS.period;
    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses.filter(isHistoryStatus)
      : [];

    return { kind, period, statuses };
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

export function countHistoryFilters(filters: HistoryFiltersState): number {
  let count = 0;
  if (filters.kind !== "all") count += 1;
  if (filters.period !== "all") count += 1;
  count += filters.statuses.length;
  return count;
}

export function historyStatusLabel(
  status: HistoryStatusValue,
  t: ReturnType<typeof useT>,
): string {
  switch (status) {
    case "completed":
      return t("history.status_completed", "Завершено");
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

type HistoryFilterDrawerProps = {
  value: HistoryFiltersState;
  onApply: (next: HistoryFiltersState) => void;
  onClose: () => void;
};

export default function HistoryFilterDrawer({
  value,
  onApply,
  onClose,
}: HistoryFilterDrawerProps) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);
  const [draft, setDraft] = useState<HistoryFiltersState>(value);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const periodOptions: { value: HistoryPeriodFilter; label: string }[] = [
    { value: "all", label: t("history.filter_all", "Все") },
    { value: "today", label: t("history.filter_today", "Сегодня") },
    { value: "yesterday", label: t("history.filter_yesterday", "Вчера") },
    { value: "7d", label: t("history.filter_7d", "7 дней") },
    { value: "30d", label: t("history.filter_30d", "30 дней") },
  ];

  const toggleStatus = (status: HistoryStatusValue) => {
    setDraft((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((item) => item !== status)
        : [...prev.statuses, status],
    }));
  };

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="history-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="history-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("history.filter", "Фильтр")}
      >
        <div className="history-drawer__top">
          <button
            type="button"
            className="app-drawer-close"
            onClick={onClose}
            aria-label={t("common.close", "Закрыть")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="history-drawer__body">
          <section className="history-filter-section">
            <p className="history-filter-section__label">
              {t("history.filter_type", "Тип")}
            </p>
            <div className="history-kind" role="group" aria-label={t("history.filter_type", "Тип")}>
              {(
                [
                  ["all", t("history.filter_all", "Все")],
                  ["wash", t("common.wash", "Мойка")],
                  ["charging", t("common.charging", "ЭЗС")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`history-kind__btn${draft.kind === key ? " is-on" : ""}`}
                  onClick={() => setDraft((prev) => ({ ...prev, kind: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="history-filter-section">
            <p className="history-filter-section__label">
              {t("history.filter_period", "Период")}
            </p>
            <div className="history-chips history-chips--wrap" role="group">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`history-chip${draft.period === option.value ? " is-on" : ""}`}
                  onClick={() => setDraft((prev) => ({ ...prev, period: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="history-filter-section">
            <p className="history-filter-section__label">
              {t("history.filter_status", "Статус")}
            </p>
            <div className="history-chips history-chips--wrap" role="group">
              <button
                type="button"
                className={`history-chip${draft.statuses.length === 0 ? " is-on" : ""}`}
                onClick={() => setDraft((prev) => ({ ...prev, statuses: [] }))}
              >
                {t("history.filter_all", "Все")}
              </button>
              {HISTORY_STATUS_VALUES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`history-chip${draft.statuses.includes(status) ? " is-on" : ""}`}
                  onClick={() => toggleStatus(status)}
                >
                  {historyStatusLabel(status, t)}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="history-drawer__footer">
          <button
            type="button"
            className="theme-button-secondary"
            onClick={() => setDraft(DEFAULT_HISTORY_FILTERS)}
          >
            {t("history.filter_reset", "Сбросить")}
          </button>
          <button
            type="button"
            className="theme-button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t("history.filter_apply", "Применить")}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
