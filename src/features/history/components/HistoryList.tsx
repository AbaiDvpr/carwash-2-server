"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import { ApiError } from "@/lib/api";
import { fetchAllSessions, type HistorySession } from "@/lib/api/sessions";
import HistoryFilterDrawer, {
  countHistoryFilters,
  DEFAULT_HISTORY_FILTERS,
  historyKindLabel,
  historyPeriodLabel,
  historyStatusLabel,
  readHistoryFilters,
  writeHistoryFilters,
  type HistoryFiltersState,
} from "./HistoryFilterDrawer";
import "./history.css";

type HistoryListProps = {
  title?: string;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "in_progress":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    case "pending":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    case "cancelled":
    case "error":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    default:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function sessionKey(session: HistorySession): string {
  return `${session.kind ?? "wash"}-${session.id}`;
}

function FilterSlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="10" r="2" />
      <circle cx="20" cy="14" r="2" />
    </svg>
  );
}

export default function HistoryList({ title }: HistoryListProps) {
  const t = useT();
  const requestId = useRef(0);
  const booted = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFiltersState>(DEFAULT_HISTORY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    setFilters(readHistoryFilters());
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    writeHistoryFilters(filters);
  }, [filters, filtersReady]);

  const filterCount = countHistoryFilters(filters);
  const filtersActive = filterCount > 0;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (filters.kind !== "all") parts.push(historyKindLabel(filters.kind, t));
    if (filters.period !== "all") parts.push(historyPeriodLabel(filters.period, t));
    if (filters.statuses.length > 0) {
      parts.push(filters.statuses.map((status) => historyStatusLabel(status, t)).join(", "));
    }
    return parts.join(" · ");
  }, [filters, t]);

  useEffect(() => {
    if (!filtersReady) return;

    const id = ++requestId.current;
    const silent = booted.current;
    if (silent) setRefreshing(true);

    void (async () => {
      try {
        const data = await fetchAllSessions({
          kind: filters.kind,
          period: filters.period,
          status: filters.statuses,
        });
        if (id !== requestId.current) return;
        setSessions(data.sessions);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setSessions([]);
        setTotal(0);
        let message = t("history.load_error", "Не удалось загрузить историю");
        if (err instanceof ApiError) {
          const body = err.body as { message?: string } | null;
          if (body?.message) message = body.message;
          else if (err.message) message = err.message;
        } else if (err instanceof Error && err.message) {
          message = err.message;
        }
        setError(message);
      } finally {
        if (id !== requestId.current) return;
        booted.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    })();
  }, [filters, filtersReady, t]);

  const toolbar = (
    <div className="history-toolbar">
      <div className="history-toolbar__row">
        {title ? (
          <h1 className="history-toolbar__title">{title}</h1>
        ) : (
          <span className="history-toolbar__spacer" />
        )}
        <div className="history-toolbar__actions">
          {filtersActive ? (
            <button
              type="button"
              className="history-filters__reset"
              onClick={() => setFilters(DEFAULT_HISTORY_FILTERS)}
            >
              {t("history.filter_reset", "Сбросить")}
            </button>
          ) : null}
          <button
            type="button"
            className={`history-filter-btn${filtersActive ? " is-on" : ""}`}
            onClick={() => setDrawerOpen(true)}
            aria-label={t("history.filter", "Фильтр")}
          >
            <FilterSlidersIcon className="history-filter-btn__icon" />
            {filterCount > 0 ? (
              <span className="history-filter-badge">{filterCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      {filtersActive && summary ? (
        <p className="history-summary__text">
          <button type="button" onClick={() => setDrawerOpen(true)}>
            <strong>{summary}</strong>
          </button>
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="app-stack" style={{ gap: "0.75rem" }}>
      {toolbar}

      {initialLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : error && !filtersActive && sessions.length === 0 ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-center text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : (
        <>
          <div className="history-filters__meta">
            <p className="theme-description text-xs">
              {t("history.total", "Всего")}:{" "}
              <span className="font-medium" style={{ color: "var(--app-text)" }}>
                {total}
              </span>
              {refreshing ? <span className="ml-2 opacity-70">…</span> : null}
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-center text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          ) : null}

          {sessions.length === 0 ? (
            <p className="app-section theme-description px-[var(--app-row-pad-x)] py-6 text-center text-xs">
              {filtersActive
                ? t("history.empty_filtered", "Ничего не найдено по фильтрам")
                : t("history.empty", "Пока нет моек и зарядок")}
            </p>
          ) : (
            <div className={`app-section${refreshing ? " opacity-60" : ""}`}>
              {sessions.map((session) => {
                const isCharging = session.kind === "charging";
                const kindLabel = isCharging
                  ? t("common.charging", "ЭЗС")
                  : t("common.wash", "Мойка");
                const duration =
                  session.duration_minutes == null
                    ? "—"
                    : `${session.duration_minutes} ${t("history.min", "мин")}`;

                return (
                  <article
                    key={sessionKey(session)}
                    className="app-row"
                    style={{ alignItems: "flex-start", flexDirection: "column" }}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="theme-description text-[0.75rem] font-medium uppercase tracking-wider">
                          {kindLabel}
                        </p>
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: "var(--app-text)" }}
                        >
                          {session.address ?? `${kindLabel} #${session.location_id}`}
                        </p>
                        <p className="theme-description mt-0.5 font-mono text-[0.8125rem] tracking-wide">
                          {session.car_plate ?? "—"}
                          {session.payment_amount != null
                            ? ` · ${new Intl.NumberFormat("ru-RU").format(Number(session.payment_amount))} ₸`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.75rem] font-medium uppercase tracking-wide ${statusTone(session.status)}`}
                      >
                        {session.status_ru ?? session.status ?? "—"}
                      </span>
                    </div>

                    <div className="mt-2 grid w-full grid-cols-3 gap-1.5 text-[0.8125rem]">
                      <div>
                        <p className="theme-description">{t("history.start", "Начало")}</p>
                        <p className="mt-0.5 font-medium" style={{ color: "var(--app-text)" }}>
                          {formatDateTime(session.entered_at ?? session.start_at)}
                        </p>
                      </div>
                      <div>
                        <p className="theme-description">{t("history.end", "Конец")}</p>
                        <p className="mt-0.5 font-medium" style={{ color: "var(--app-text)" }}>
                          {formatDateTime(session.exited_at ?? session.end_at)}
                        </p>
                      </div>
                      <div>
                        <p className="theme-description">
                          {isCharging
                            ? t("history.session", "Сессия")
                            : t("history.washed", "Мыли")}
                        </p>
                        <p className="mt-0.5 font-medium" style={{ color: "var(--app-text)" }}>
                          {duration}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {drawerOpen ? (
        <HistoryFilterDrawer
          value={filters}
          onApply={setFilters}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
