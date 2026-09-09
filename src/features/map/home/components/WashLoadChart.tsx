"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  fetchCwLocationLoad,
  type CwLocationLoad,
} from "@/lib/api/cw";
import { useT } from "@/hooks/useT";

const AXIS_HOURS = [0, 6, 12, 18, 23] as const;
const CHART_H = 120;
const MIN_BAR_H = 6;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

type WashLoadChartProps = {
  locationId: number | string;
};

export default function WashLoadChart({ locationId }: WashLoadChartProps) {
  const t = useT();
  const [data, setData] = useState<CwLocationLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

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
          setError(t("map.load_error", "Не удалось загрузить нагрузку"));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, t]);

  const maxCount = data?.max_hour_sessions ?? 0;
  const hours = data?.hours ?? [];

  const nowPct = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    return ((h * 60 + m) / (24 * 60)) * 100;
  }, [now]);

  const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const chartStyle = { "--wash-load-h": `${CHART_H}px` } as CSSProperties;

  return (
    <div className="wash-load">
      <h3 className="wash-load__title">
        {t("map.wash_load", "Загруженность")}
      </h3>
      <p className="wash-load__subtitle">
        {t("map.wash_load_today", "Нагрузка мойки за сегодня")}
      </p>

      {loading ? (
        <p className="wash-load__hint">{t("common.loading", "Загрузка…")}</p>
      ) : error ? (
        <p className="wash-load__hint">{error}</p>
      ) : (
        <div className="wash-load__chart" style={chartStyle}>
          <div className="wash-load__plot">
            <div className="wash-load__cap" aria-hidden />
            <div
              className="wash-load__bars"
              role="img"
              aria-label={t("map.wash_load", "Загруженность")}
            >
              {hours.map((item) => {
                const ratio = maxCount > 0 ? item.count / maxCount : 0;
                const height =
                  item.count > 0
                    ? Math.max(MIN_BAR_H, Math.round(ratio * CHART_H))
                    : 2;
                return (
                  <div
                    key={item.hour}
                    className="wash-load__col"
                    title={`${formatHourLabel(item.hour)} · ${item.count}`}
                  >
                    <div
                      className={`wash-load__bar${item.count > 0 ? " is-filled" : ""}`}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className="wash-load__now"
              style={{ left: `${nowPct}%` }}
              aria-hidden
            >
              <span className="wash-load__now-line" />
              <span className="wash-load__now-badge">{nowLabel}</span>
            </div>
          </div>
          <div className="wash-load__axis">
            {AXIS_HOURS.map((h) => (
              <span key={h}>{formatHourLabel(h)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
