"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  fetchCwLocationLoad,
  type CwLocationLoad,
} from "@/lib/api/cw";
import { useT } from "@/hooks/useT";

const AXIS_HOURS = [0, 6, 12, 18, 23] as const;
const Y_TICKS = [100, 75, 50, 25, 0] as const;
const CHART_H = 120;
const MIN_BAR_H = 6;

/** Только текущая неделя: Пн→Вс */
const WEEK_DAYS = [
  { jsDay: 1, key: "mon" },
  { jsDay: 2, key: "tue" },
  { jsDay: 3, key: "wed" },
  { jsDay: 4, key: "thu" },
  { jsDay: 5, key: "fri" },
  { jsDay: 6, key: "sat" },
  { jsDay: 0, key: "sun" },
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function mondayOfWeek(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekDates(ref: Date): { jsDay: number; key: string; date: string }[] {
  const monday = mondayOfWeek(ref);
  return WEEK_DAYS.map((item, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return { ...item, date: toYmd(d) };
  });
}

type WashLoadChartProps = {
  locationId: number | string;
};

export default function WashLoadChart({ locationId }: WashLoadChartProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const todayYmd = toYmd(now);
  const days = useMemo(() => weekDates(now), [todayYmd]);
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const [data, setData] = useState<CwLocationLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isToday = selectedDate === todayYmd;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setSelectedDate((prev) => {
      if (prev > todayYmd) return todayYmd;
      return days.some((d) => d.date === prev) ? prev : todayYmd;
    });
  }, [days, todayYmd]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCwLocationLoad(locationId, selectedDate)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            t("map.wash_load_error", "Не удалось загрузить нагрузку"),
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, selectedDate, t]);

  const washersTotal = data?.washers_total ?? 0;
  const maxCount = data?.max_hour_sessions ?? 0;
  const hours = data?.hours ?? [];

  function hourLoadPct(count: number): number {
    if (count <= 0) return 0;
    if (washersTotal > 0) {
      return Math.min(100, Math.round((count / washersTotal) * 100));
    }
    if (maxCount > 0) {
      return Math.min(100, Math.round((count / maxCount) * 100));
    }
    return 0;
  }

  const nowPct = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    return ((h * 60 + m) / (24 * 60)) * 100;
  }, [now]);

  const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const chartStyle = { "--wash-load-h": `${CHART_H}px` } as CSSProperties;

  const DAY_FALLBACK: Record<string, string> = {
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
    sun: "Вс",
  };

  return (
    <div className="wash-load">
      <h3 className="wash-load__title">
        {t("map.wash_load", "Загруженность")}
      </h3>

      <div
        className="wash-load__days"
        role="tablist"
        aria-label={t("map.wash_load_week", "Дни недели")}
      >
        {days.map((day) => {
          const active = day.date === selectedDate;
          const disabled = day.date > todayYmd;
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              className={`wash-load__day${active ? " is-active" : ""}${
                disabled ? " is-disabled" : ""
              }`}
              onClick={() => {
                if (disabled) return;
                setSelectedDate(day.date);
              }}
            >
              <span>
                {t(`map.day_${day.key}`, DAY_FALLBACK[day.key] ?? day.key)}
              </span>
              {active ? (
                <span className="wash-load__day-dot" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="wash-load__hint">{t("common.loading", "Загрузка…")}</p>
      ) : error ? (
        <p className="wash-load__hint">{error}</p>
      ) : (
        <div className="wash-load__chart" style={chartStyle}>
          <div className="wash-load__main">
            <div className="wash-load__y" aria-hidden>
              {Y_TICKS.map((pct) => (
                <span key={pct} style={{ bottom: `${pct}%` }}>
                  {pct}%
                </span>
              ))}
            </div>
            <div className="wash-load__plot">
              <div className="wash-load__grid" aria-hidden>
                {Y_TICKS.map((pct) => (
                  <span
                    key={pct}
                    className="wash-load__grid-line"
                    style={{ bottom: `${pct}%` }}
                  />
                ))}
              </div>
              <div
                className="wash-load__bars"
                role="img"
                aria-label={t("map.wash_load", "Загруженность")}
              >
                {hours.map((item) => {
                  const pct = hourLoadPct(item.count);
                  const height =
                    pct > 0
                      ? Math.max(MIN_BAR_H, Math.round((pct / 100) * CHART_H))
                      : 2;
                  const tip = `${formatHourLabel(item.hour)} · ${pct}%`;
                  return (
                    <div key={item.hour} className="wash-load__col" title={tip}>
                      <div
                        className={`wash-load__bar${pct > 0 ? " is-filled" : ""}`}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                  );
                })}
              </div>
              {isToday ? (
                <div
                  className="wash-load__now"
                  style={{ left: `${nowPct}%` }}
                  aria-hidden
                >
                  <span className="wash-load__now-line" />
                  <span className="wash-load__now-badge">{nowLabel}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="wash-load__axis">
            <span className="wash-load__axis-pad" aria-hidden />
            <div className="wash-load__axis-hours">
              {AXIS_HOURS.map((h) => (
                <span key={h}>{formatHourLabel(h)}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
