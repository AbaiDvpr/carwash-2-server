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
import ServiceFillProgress from "./ServiceFillProgress";
import "./charging-session-variants.css";

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

function ParamsCard({
  stats,
  title,
  portStand,
  address,
}: {
  stats: LiveStats;
  title: string;
  portStand: string;
  address: string;
}) {
  const t = useT();
  const rows = [
    { label: t("ev.order_address", "Адрес"), value: address },
    { label: t("ev.order_station", "Станция"), value: portStand },
    { label: t("ev.order_for", "Заказ на"), value: stats.orderLabel },
    { label: t("ev.charged", "Заряжено"), value: `${stats.chargedKwh.toFixed(2)} кВт·ч` },
    { label: t("payment.tariff", "Тариф"), value: stats.priceLabel },
    { label: t("payment.to_pay", "Стоимость"), value: `${stats.costTg.toLocaleString("ru-RU")} ₸` },
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

function PassPlaque({
  remainingKwh,
  onBuy,
}: {
  remainingKwh: number | null;
  onBuy?: () => void;
}) {
  if (remainingKwh != null && remainingKwh > 0) {
    return (
      <p className="csv-pass csv-pass--ok">
        Абонемент · осталось {remainingKwh.toLocaleString("ru-RU")} кВт·ч
      </p>
    );
  }
  return (
    <button type="button" className="csv-pass csv-pass--buy" onClick={onBuy}>
      Купить абонемент
    </button>
  );
}

type ChargingSessionViewProps = {
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
  /** Остаток активного абонемента, кВт·ч. null — нет абонемента */
  passRemainingKwh?: number | null;
};

export default function ChargingSessionView({
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
  passRemainingKwh = null,
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

  const note = cancelNote ? (
    <div className="ev-checkout__note" role="alert">
      {t(
        "ev.cancel_stub",
        "Ой, стоп — сорри, этого функционала пока нет. Дождитесь окончания.",
      )}
    </div>
  ) : null;

  return (
    <div className="csv csv--refined">
      <section className="profile-card csv-shell">
        <div className="csv-shell__head">
          <span className="csv-ev-badge csv-ev-badge--inline" aria-hidden>
            <EvStationIcon />
            <span>{t("common.charging", "ЭЗС")}</span>
          </span>
        </div>
        <div className="csv-shell__body">
          <ServiceFillProgress percent={stats.displayPercent} variant="charging" />
        </div>
      </section>

      <PassPlaque remainingKwh={passRemainingKwh} />

      <ParamsCard
        stats={stats}
        title={t("ev.params_title", "Параметры зарядки")}
        portStand={stats.portStand}
        address={station.address}
      />
      {note}
      <div className="csv-actions">
        <button type="button" className="theme-button w-full" onClick={onCancelNote}>
          {t("common.cancel", "Отменить")}
        </button>
      </div>
    </div>
  );
}
