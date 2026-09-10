"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  fetchCwLocationLoad,
  type CwLoadHour,
  type CwLocationLoad,
} from "@/lib/api/cw";
import { useT } from "@/hooks/useT";

const AXIS_HOURS = [0, 6, 12, 18, 23] as const;
const CHART_H = 120;
const MIN_BAR_H = 6;
const EMPTY_HOURS: CwLoadHour[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  count: 0,
}));

const WEEK_DAYS = [
  { key: "mon" },
  { key: "tue" },
  { key: "wed" },
  { key: "thu" },
  { key: "fri" },
  { key: "sat" },
  { key: "sun" },
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

/** JS getDay(): 0=Sun → mon…sun key */
function weekdayKeyFromDate(d: Date): string {
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return map[d.getDay()] ?? "mon";
}

function formatAvg(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function yTicks(yMax: number): number[] {
  const top = Math.max(1, yMax);
  const raw = [top, (top * 3) / 4, top / 2, top / 4, 0].map((v) =>
    Math.round(v),
  );
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of raw) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

type WashLoadChartProps = {
  locationId: number | string;
};

export default function WashLoadChart({ locationId }: WashLoadChartProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const todayKey = weekdayKeyFromDate(now);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [data, setData] = useState<CwLocationLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isToday = selectedKey === todayKey;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCwLocationLoad(locationId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            t("map.wash_load_error", "Не удалось загрузить нагрузку"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, t]);

  const yMax = Math.max(1, data?.y_max ?? data?.max_hour_sessions ?? 4);
  const ticks = useMemo(() => yTicks(yMax), [yMax]);
  const hours =
    data?.weekdays?.[selectedKey]?.hours?.length === 24
      ? data.weekdays[selectedKey].hours
      : EMPTY_HOURS;

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
      <p className="wash-load__subtitle">
        {t(
          "map.wash_load_avg_30d",
          "Среднее число стартов мойки за 30 дней",
        )}
      </p>

      <div
        className="wash-load__days"
        role="tablist"
        aria-label={t("map.wash_load_week", "Дни недели")}
      >
        {WEEK_DAYS.map((day) => {
          const active = day.key === selectedKey;
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`wash-load__day${active ? " is-active" : ""}`}
              onClick={() => setSelectedKey(day.key)}
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

      <div
        className={`wash-load__chart${loading ? " is-loading" : ""}${error && !loading ? " is-error" : ""}`}
        style={chartStyle}
        aria-busy={loading || undefined}
      >
        <div className="wash-load__main">
          <div className="wash-load__y" aria-hidden>
            {ticks.map((value) => (
              <span
                key={value}
                style={{ bottom: `${(value / yMax) * 100}%` }}
              >
                {value}
              </span>
            ))}
          </div>
          <div className="wash-load__plot">
            <div className="wash-load__grid" aria-hidden>
              {ticks.map((value) => (
                <span
                  key={value}
                  className="wash-load__grid-line"
                  style={{ bottom: `${(value / yMax) * 100}%` }}
                />
              ))}
            </div>
            <div
              className="wash-load__bars"
              role="img"
              aria-label={t("map.wash_load", "Загруженность")}
            >
              {hours.map((item) => {
                const avg = Number(item.count) || 0;
                const ratio = Math.min(1, avg / yMax);
                const height =
                  avg > 0
                    ? Math.max(MIN_BAR_H, Math.round(ratio * CHART_H))
                    : 2;
                const tip = `${formatHourLabel(item.hour)} · ${formatAvg(avg)}`;
                return (
                  <div key={item.hour} className="wash-load__col" title={tip}>
                    <div
                      className={`wash-load__bar${avg > 0 ? " is-filled" : ""}`}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div className="wash-load__shimmer" aria-hidden>
                {EMPTY_HOURS.map((item) => (
                  <div key={item.hour} className="wash-load__col">
                    <div
                      className="wash-load__shimmer-bar"
                      style={{
                        ["--wash-shimmer-i" as string]: String(item.hour),
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && isToday ? (
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

        {error && !loading ? (
          <p className="wash-load__hint wash-load__hint--abs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
