"use client";

import { useEffect, useRef, useState } from "react";
import { useT, useLocale } from "@/hooks/useT";
import AppBackButton from "@/components/ui/AppBackButton";
import ApiFailBlock from "@/components/ui/ApiFailBlock";
import { ApiError } from "@/lib/api";
import { apiFailMessage } from "@/lib/apiFail";
import { fetchAllSessions, washLeftWithoutWash, type HistorySession } from "@/lib/api/sessions";
import HistoryFilterDrawer, {
  countHistoryFilters,
  DEFAULT_HISTORY_FILTERS,
  historyStatusLabel,
  HISTORY_STATUS_VALUES,
  readHistoryFilters,
  writeHistoryFilters,
  type HistoryFiltersState,
  type HistoryStatusValue,
} from "./HistoryFilterDrawer";
import "./history.css";

type HistoryListProps = {
  title?: string;
  kind?: "wash" | "charging";
  onBack?: () => void;
};

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const loc = locale === "en" ? "en-GB" : locale === "kz" ? "kk-KZ" : "ru-RU";
  return date.toLocaleString(loc, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveHistoryStatus(
  status: string | null,
): HistoryStatusValue | null {
  if (!status) return null;
  return (HISTORY_STATUS_VALUES as readonly string[]).includes(status)
    ? (status as HistoryStatusValue)
    : null;
}

function statusClass(status: string | null): string {
  switch (status) {
    case "completed":
      return "is-completed";
    case "charging":
    case "in_progress":
    case "invited":
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

function sameHistoryFilters(
  a: HistoryFiltersState,
  b: HistoryFiltersState,
): boolean {
  return (
    a.wash.period === b.wash.period &&
    a.charging.period === b.charging.period &&
    a.wash.statuses.join() === b.wash.statuses.join() &&
    a.charging.statuses.join() === b.charging.statuses.join()
  );
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

function HistorySkeleton() {
  return (
    <div className="history-skeleton" aria-hidden>
      {[1, 2, 3].map((key) => (
        <div key={key} className="history-skeleton__card" />
      ))}
    </div>
  );
}

export default function HistoryList({ title, kind, onBack }: HistoryListProps) {
  const t = useT();
  const locale = useLocale();
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

  const filterCount = countHistoryFilters(filters, kind);
  const filtersActive = filterCount > 0;

  useEffect(() => {
    if (!filtersReady) return;

    const id = ++requestId.current;
    const silent = booted.current;
    if (silent) setRefreshing(true);

    void (async () => {
      try {
        const washQuery = {
          period: filters.wash.period,
          status: filters.wash.statuses,
        };
        const chargingQuery = {
          period: filters.charging.period,
          status: filters.charging.statuses,
        };
        const data = await fetchAllSessions(
          kind === "wash"
            ? { wash: washQuery }
            : kind === "charging"
              ? { charging: chargingQuery }
              : { wash: washQuery, charging: chargingQuery },
        );
        if (id !== requestId.current) return;
        const rows =
          kind == null
            ? data.sessions
            : data.sessions.filter((session) => session.kind === kind);
        setSessions(rows);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setSessions([]);
        setError(apiFailMessage(t));
      } finally {
        if (id !== requestId.current) return;
        booted.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    })();
  }, [filters, filtersReady, kind, t]);

  const searching = initialLoading || refreshing;

  return (
    <div className="history-page" aria-busy={searching}>
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

      {searching ? (
        <HistorySkeleton />
      ) : error && !filtersActive && sessions.length === 0 ? (
        <ApiFailBlock onRetry={() => window.location.reload()} />
      ) : (
        <>
          {error ? (
            <ApiFailBlock onRetry={() => window.location.reload()} />
          ) : null}

          {sessions.length === 0 ? (
            <div className="history-empty">
              <img
                className="history-empty__illust"
                src={
                  filtersActive
                    ? "/img/illustrations/history_ev_cw_ff.png"
                    : "/img/illustrations/history_ev_cw.png"
                }
                alt=""
                aria-hidden
              />
              <p className="history-empty__text">
                {filtersActive
                  ? t("history.empty_filtered", "Ничего не найдено по фильтрам")
                  : kind === "wash"
                    ? t("history.empty_wash", "Пока нет моек")
                    : kind === "charging"
                      ? t("history.empty_charging", "Пока нет зарядок")
                      : t("history.empty", "Пока нет моек и зарядок")}
              </p>
            </div>
          ) : (
            <div className="history-list">
              {sessions.map((session) => {
                const isCharging = session.kind === "charging";
                const kindLabel = isCharging
                  ? t("common.charging", "ЭЗС")
                  : t("common.wash", "Мойка");
                const duration =
                  session.duration_minutes == null
                    ? "—"
                    : `${session.duration_minutes} ${t("history.min", "мин")}`;
                const walkedAway = washLeftWithoutWash(session);
                const statusCode = walkedAway
                  ? "completed"
                  : resolveHistoryStatus(session.status);
                const statusLabel = walkedAway
                  ? t("wash.done_title", "Мойка завершена")
                  : statusCode
                    ? historyStatusLabel(statusCode, t)
                    : (session.status ?? "—");

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
                          className={`history-session__status ${statusClass(
                            walkedAway ? "completed" : session.status,
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="history-session__times">
                        <div className="history-session__time">
                          <p className="history-session__time-label">
                            {t("history.start", "Начало")}
                          </p>
                          <p className="history-session__time-value">
                            {formatDateTime(
                              session.entered_at ?? session.start_at,
                              locale,
                            )}
                          </p>
                        </div>
                        <div className="history-session__time">
                          <p className="history-session__time-label">
                            {t("history.end", "Конец")}
                          </p>
                          <p className="history-session__time-value">
                            {formatDateTime(
                              session.exited_at ?? session.end_at,
                              locale,
                            )}
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
          kind={kind}
          onApply={(next) => {
            if (sameHistoryFilters(next, filters)) return;
            setRefreshing(true);
            setFilters(next);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
