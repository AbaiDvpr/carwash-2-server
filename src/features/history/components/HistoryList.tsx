"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import AppBackButton from "@/components/ui/AppBackButton";
import { ApiError } from "@/lib/api";
import { fetchAllSessions, type HistorySession } from "@/lib/api/sessions";
import HistoryFilterDrawer, {
  countHistoryFilters,
  DEFAULT_HISTORY_FILTERS,
  readHistoryFilters,
  writeHistoryFilters,
  type HistoryFiltersState,
} from "./HistoryFilterDrawer";
import "./history.css";

type HistoryListProps = {
  title?: string;
  onBack?: () => void;
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

function statusClass(status: string | null): string {
  switch (status) {
    case "completed":
      return "is-completed";
    case "charging":
    case "in_progress":
      return "is-in_progress";
    case "pending":
      return "is-pending";
    case "cancelled":
      return "is-cancelled";
    case "error":
      return "is-error";
    default:
      return "";
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

export default function HistoryList({ title, onBack }: HistoryListProps) {
  const t = useT();
  const requestId = useRef(0);
  const booted = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
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

  useEffect(() => {
    if (!filtersReady) return;

    const id = ++requestId.current;
    const silent = booted.current;
    if (silent) setRefreshing(true);

    void (async () => {
      try {
        const data = await fetchAllSessions({
          wash: {
            period: filters.wash.period,
            status: filters.wash.statuses,
          },
          charging: {
            period: filters.charging.period,
            status: filters.charging.statuses,
          },
        });
        if (id !== requestId.current) return;
        setSessions(data.sessions);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setSessions([]);
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

  return (
    <div className="history-page">
      <div className="app-back-bar app-back-bar--stack history-toolbar">
        <div className="history-toolbar__row">
          {onBack ? (
            <AppBackButton title={title} onClick={onBack} />
          ) : title ? (
            <h1 className="history-toolbar__title">{title}</h1>
          ) : (
            <span className="history-toolbar__spacer" />
          )}
          <div className="history-toolbar__actions">
            <button
              type="button"
              className={`app-drawer-close history-filter-btn${filtersActive ? " is-on" : ""}`}
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
      </div>

      {initialLoading ? (
        <div className="history-skeleton" aria-hidden>
          {[1, 2, 3].map((key) => (
            <div key={key} className="history-skeleton__card" />
          ))}
        </div>
      ) : error && !filtersActive && sessions.length === 0 ? (
        <div className="history-card">
          <p className="history-card__error">{error}</p>
        </div>
      ) : (
        <>
          {error ? (
            <div className="history-card">
              <p className="history-card__error">{error}</p>
            </div>
          ) : null}

          {sessions.length === 0 ? (
            <div className="history-card">
              <p className="history-card__empty">
                {filtersActive
                  ? t("history.empty_filtered", "Ничего не найдено по фильтрам")
                  : t("history.empty", "Пока нет моек и зарядок")}
              </p>
            </div>
          ) : (
            <div className={`history-list${refreshing ? " is-dim" : ""}`}>
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
                  <article key={sessionKey(session)} className="history-session">
                    <div className="history-session__body">
                      <div className="history-session__top">
                        <div className="history-session__main">
                          <span className="history-session__label">{kindLabel}</span>
                          <span className="history-session__title">
                            {session.address ?? `${kindLabel} #${session.location_id}`}
                          </span>
                        </div>
                        <span
                          className={`history-session__status ${statusClass(session.status)}`}
                        >
                          {session.status_ru ?? session.status ?? "—"}
                        </span>
                      </div>

                      <div className="history-session__times">
                        <div className="history-session__time">
                          <p className="history-session__time-label">
                            {t("history.start", "Начало")}
                          </p>
                          <p className="history-session__time-value">
                            {formatDateTime(session.entered_at ?? session.start_at)}
                          </p>
                        </div>
                        <div className="history-session__time">
                          <p className="history-session__time-label">
                            {t("history.end", "Конец")}
                          </p>
                          <p className="history-session__time-value">
                            {formatDateTime(session.exited_at ?? session.end_at)}
                          </p>
                        </div>
                        <div className="history-session__time">
                          <p className="history-session__time-label">
                            {isCharging
                              ? t("history.session", "Сессия")
                              : t("history.washed", "Мыли")}
                          </p>
                          <p className="history-session__time-value">{duration}</p>
                        </div>
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
