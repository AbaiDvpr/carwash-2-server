"use client";

import { useEffect, useMemo, useState } from "react";
import type { Station, StationChargerStand, StationConnectorPort } from "@/data/stations";
import { formatPowerKw, formatPricePerKwh } from "@/features/map/evConnectors";
import { useT } from "@/hooks/useT";
import {
  CHARGE_MS,
  type EvCheckoutLimits,
} from "@/features/home/components/EvChargeCheckout";
import type { EvChargeStep } from "@/features/home/components/EvChargeFlow";
import "./charging-session-variants.css";

export type ChargingUiVariant =
  | "original"
  | "v1"
  | "v2"
  | "v3"
  | "v4"
  | "v5"
  | "v6";

export const CHARGING_UI_VARIANTS: {
  id: ChargingUiVariant;
  label: string;
}[] = [
  { id: "original", label: "Оригинал" },
  { id: "v1", label: "1" },
  { id: "v2", label: "2" },
  { id: "v3", label: "3" },
  { id: "v4", label: "4" },
  { id: "v5", label: "5" },
  { id: "v6", label: "6" },
];

const VARIANT_KEY = "hipoint:charging-ui-variant";

export function readChargingUiVariant(): ChargingUiVariant {
  try {
    const raw = sessionStorage.getItem(VARIANT_KEY);
    if (
      raw === "original" ||
      raw === "v1" ||
      raw === "v2" ||
      raw === "v3" ||
      raw === "v4" ||
      raw === "v5" ||
      raw === "v6"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "original";
}

export function writeChargingUiVariant(variant: ChargingUiVariant) {
  try {
    sessionStorage.setItem(VARIANT_KEY, variant);
  } catch {
    /* ignore */
  }
}

function EvStationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="7 3 10 18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
    </svg>
  );
}

type LiveStats = {
  progress: number;
  displayPercent: number;
  targetPercent: number;
  powerLabel: string;
  durationMin: number;
  orderLabel: string;
  chargedKwh: number;
  costTg: number;
  priceLabel: string;
  portStand: string;
};

function useChargeProgress(
  step: EvChargeStep,
  chargeEndsAt: number | null | undefined,
  onChargeEndsAt: ((endsAt: number) => void) | undefined,
  onStepChange: (step: EvChargeStep) => void,
) {
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (step !== "charging") return;

    let endsAt = chargeEndsAt;
    if (endsAt == null) {
      endsAt = Date.now() + CHARGE_MS;
      onChargeEndsAt?.(endsAt);
    }

    const startedAt = endsAt - CHARGE_MS;

    const tick = () => {
      const now = Date.now();
      const p = Math.min(1, Math.max(0, (now - startedAt) / CHARGE_MS));
      setProgress(p * 100);
      setElapsedMs(Math.max(0, now - startedAt));
      if (now >= endsAt) {
        setProgress(100);
        onStepChange("charged_ok");
        return false;
      }
      return true;
    };

    if (!tick()) return;
    const id = window.setInterval(() => {
      if (!tick()) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [step, chargeEndsAt, onChargeEndsAt, onStepChange]);

  return { progress, elapsedMs };
}

function buildStats(input: {
  progress: number;
  elapsedMs: number;
  limits: EvCheckoutLimits;
  port: StationConnectorPort;
  stand: StationChargerStand;
}): LiveStats {
  const { progress, elapsedMs, limits, port, stand } = input;
  const targetPercent = limits.tab === "charge" ? limits.chargeTo : 100;
  const displayPercent = Math.min(
    targetPercent,
    Math.round((progress / 100) * targetPercent),
  );
  const power = port.powerKw ?? stand.powerKw ?? 0;
  const price = port.pricePerKwh ?? stand.pricePerKwh ?? 80;
  const fullKwh = Math.max(5, (targetPercent / 100) * 40);
  const chargedKwh = Math.round((progress / 100) * fullKwh * 100) / 100;
  const costTg = Math.round(chargedKwh * Number(price) * 10) / 10;
  const orderLabel =
    limits.tab === "price"
      ? `${limits.priceLimit.toLocaleString("ru-RU")} ₸`
      : limits.tab === "time"
        ? `${limits.minutes} мин`
        : `${limits.chargeTo} %`;

  return {
    progress,
    displayPercent,
    targetPercent,
    powerLabel: power ? formatPowerKw(power) : "—",
    durationMin: Math.floor(elapsedMs / 60_000),
    orderLabel,
    chargedKwh,
    costTg,
    priceLabel: formatPricePerKwh(Number(price)),
    portStand: `${port.label}/${stand.title}`,
  };
}

function ProgressRing({
  progress,
  percent,
  size = "lg",
}: {
  progress: number;
  percent: number;
  size?: "lg" | "md";
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress / 100);
  return (
    <div
      className={`csv-ring csv-ring--${size}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <svg viewBox="0 0 96 96" aria-hidden>
        <circle className="csv-ring__track" cx="48" cy="48" r={r} />
        <circle
          className="csv-ring__value"
          cx="48"
          cy="48"
          r={r}
          style={{
            strokeDasharray: `${c}`,
            strokeDashoffset: `${offset}`,
          }}
        />
      </svg>
      <span className="csv-ring__pct">{percent}%</span>
    </div>
  );
}

function ParamsCard({
  stats,
  title,
}: {
  stats: LiveStats;
  title: string;
}) {
  const rows = [
    { label: "Заказ на", value: stats.orderLabel },
    { label: "Заряжено", value: `${stats.chargedKwh.toFixed(2)} кВт·ч` },
    { label: "Тариф", value: stats.priceLabel },
    { label: "Стоимость", value: `${stats.costTg.toLocaleString("ru-RU")} ₸` },
  ];
  return (
    <section className="profile-card csv-params">
      <div className="profile-card__balance">
        <p className="csv-params__title">{title}</p>
        {rows.map((row) => (
          <div key={row.label} className="profile-card__balance-item csv-params__row">
            <p className="profile-card__balance-label">{row.label}</p>
            <p className="profile-card__balance-value">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type ChargingSessionViewProps = {
  variant: ChargingUiVariant;
  step: EvChargeStep;
  onStepChange: (step: EvChargeStep) => void;
  port: StationConnectorPort;
  stand: StationChargerStand;
  station: Station;
  limits: EvCheckoutLimits;
  chargeEndsAt?: number | null;
  onChargeEndsAt?: (endsAt: number) => void;
  onCancelNote: () => void;
  cancelNote: boolean;
};

export default function ChargingSessionView({
  variant,
  step,
  onStepChange,
  port,
  stand,
  station,
  limits,
  chargeEndsAt = null,
  onChargeEndsAt,
  onCancelNote,
  cancelNote,
}: ChargingSessionViewProps) {
  const t = useT();
  const { progress, elapsedMs } = useChargeProgress(
    step,
    chargeEndsAt,
    onChargeEndsAt,
    onStepChange,
  );

  const stats = useMemo(
    () => buildStats({ progress, elapsedMs, limits, port, stand }),
    [progress, elapsedMs, limits, port, stand],
  );

  const statusLine = t(
    "ev.charging_power_line",
    "Идёт зарядка (мощность {{power}})",
  ).replace("{{power}}", stats.powerLabel);

  const durationLine = t(
    "ev.charging_duration_line",
    "Длительность зарядки {{min}} мин",
  ).replace("{{min}}", String(stats.durationMin));

  const cancelBtn = (
    <button
      type="button"
      className="theme-button-secondary w-full"
      onClick={onCancelNote}
    >
      {t("common.cancel", "Отменить")}
    </button>
  );

  const note = cancelNote ? (
    <div className="ev-checkout__note" role="alert">
      {t(
        "ev.cancel_stub",
        "Ой, стоп — сорри, этого функционала пока нет. Дождитесь окончания.",
      )}
    </div>
  ) : null;

  if (variant === "original") {
    return (
      <div className="csv csv--original">
        <div className="csv-ev-badge" aria-hidden>
          <EvStationIcon />
          <span>{t("common.charging", "ЭЗС")}</span>
        </div>
        <ProgressRing progress={stats.progress} percent={stats.displayPercent} />
        <p className="csv-status">{statusLine}</p>
        <p className="csv-duration">{durationLine}</p>
        <ParamsCard
          stats={stats}
          title={t("ev.params_title", "Параметры зарядки")}
        />
        {note}
        <div className="csv-actions csv-actions--pair">
          {cancelBtn}
          <button type="button" className="theme-button w-full" disabled>
            {t("ev.change_order", "Изменить заказ")}
          </button>
        </div>
      </div>
    );
  }

  if (variant === "v1") {
    return (
      <div className="csv csv--v1">
        <div className="csv-ev-mark" aria-hidden>
          <EvStationIcon />
        </div>
        <ProgressRing progress={stats.progress} percent={stats.displayPercent} />
        <h2 className="ev-flow__title">{t("ev.charging_title", "Идёт зарядка")}</h2>
        <p className="ev-flow__hint">{statusLine}</p>
        <div className="csv-chips">
          <span className="csv-chip">{stats.powerLabel}</span>
          <span className="csv-chip">{stats.durationMin} мин</span>
          <span className="csv-chip">{stats.costTg} ₸</span>
        </div>
        {note}
        <div className="csv-actions">{cancelBtn}</div>
      </div>
    );
  }

  if (variant === "v2") {
    return (
      <div className="csv csv--v2">
        <section className="profile-card csv-shell">
          <div className="csv-shell__head">
            <span className="csv-ev-badge csv-ev-badge--inline" aria-hidden>
              <EvStationIcon />
              <span>{t("common.charging", "ЭЗС")}</span>
            </span>
            <p className="csv-shell__port">{stats.portStand}</p>
          </div>
          <div className="csv-shell__body">
            <ProgressRing
              progress={stats.progress}
              percent={stats.displayPercent}
              size="md"
            />
            <p className="csv-status">{statusLine}</p>
            <p className="csv-duration">{durationLine}</p>
          </div>
        </section>
        <ParamsCard
          stats={stats}
          title={t("ev.params_title", "Параметры зарядки")}
        />
        {note}
        <div className="csv-actions">{cancelBtn}</div>
      </div>
    );
  }

  if (variant === "v3") {
    return (
      <div className="csv csv--v3">
        <div className="csv-v3-head">
          <span className="csv-ev-mark" aria-hidden>
            <EvStationIcon />
          </span>
          <div className="csv-v3-head__text">
            <p className="csv-v3-pct">{stats.displayPercent}%</p>
            <p className="csv-status">{statusLine}</p>
          </div>
        </div>
        <div className="csv-bar" aria-hidden>
          <span style={{ width: `${stats.progress}%` }} />
        </div>
        <p className="csv-duration">{durationLine}</p>
        <ParamsCard
          stats={stats}
          title={t("ev.params_title", "Параметры зарядки")}
        />
        {note}
        <div className="csv-actions">{cancelBtn}</div>
      </div>
    );
  }

  if (variant === "v4") {
    return (
      <div className="csv csv--v4">
        <div className="csv-v4-hero">
          <ProgressRing progress={stats.progress} percent={stats.displayPercent} />
          <div className="csv-v4-side">
            <span className="csv-ev-mark csv-ev-mark--lg" aria-hidden>
              <EvStationIcon />
            </span>
            <p className="csv-v4-side__label">{t("common.charging", "ЭЗС")}</p>
            <p className="csv-v4-side__meta">{stats.powerLabel}</p>
            <p className="csv-v4-side__meta">{stats.durationMin} мин</p>
          </div>
        </div>
        <ParamsCard
          stats={stats}
          title={t("ev.params_title", "Параметры зарядки")}
        />
        {note}
        <div className="csv-actions">{cancelBtn}</div>
      </div>
    );
  }

  if (variant === "v5") {
    return (
      <div className="csv csv--v5">
        <div className="csv-v5-marker" aria-hidden>
          <EvStationIcon />
        </div>
        <ProgressRing progress={stats.progress} percent={stats.displayPercent} />
        <p className="csv-status">{statusLine}</p>
        <p className="csv-duration">{durationLine}</p>
        <div className="csv-grid">
          <div className="csv-grid__cell">
            <span>Заказ</span>
            <strong>{stats.orderLabel}</strong>
          </div>
          <div className="csv-grid__cell">
            <span>кВт·ч</span>
            <strong>{stats.chargedKwh.toFixed(2)}</strong>
          </div>
          <div className="csv-grid__cell">
            <span>Тариф</span>
            <strong>{stats.priceLabel}</strong>
          </div>
          <div className="csv-grid__cell">
            <span>Сумма</span>
            <strong>{stats.costTg} ₸</strong>
          </div>
        </div>
        {note}
        <div className="csv-actions">{cancelBtn}</div>
      </div>
    );
  }

  // v6
  return (
    <div className="csv csv--v6">
      <div className="csv-v6-top">
        <span className="csv-ev-badge" aria-hidden>
          <EvStationIcon />
          <span>{t("common.charging", "ЭЗС")}</span>
        </span>
        <p className="csv-v6-port">{stats.portStand}</p>
      </div>
      <ProgressRing progress={stats.progress} percent={stats.displayPercent} />
      <p className="csv-status">{statusLine}</p>
      <p className="csv-duration">{durationLine}</p>
      <div className="csv-v6-strip">
        <span>{stats.orderLabel}</span>
        <span>{stats.chargedKwh.toFixed(2)} кВт·ч</span>
        <span>{stats.costTg} ₸</span>
      </div>
      {note}
      <div className="csv-actions">{cancelBtn}</div>
    </div>
  );
}
