"use client";

import { useEffect, useState } from "react";
import ServiceFillProgress from "@/features/charging/ServiceFillProgress";
import { useT } from "@/hooks/useT";
import "@/features/charging/charging-session-variants.css";
import "./wash-session.css";

export const WASH_MS = 60_000;

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

type WashSessionViewProps = {
  stationTitle: string;
  tariffTitle: string;
  price: number;
  onDone: () => void;
};

export default function WashSessionView({
  stationTitle,
  tariffTitle,
  price,
  onDone,
}: WashSessionViewProps) {
  const t = useT();
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const endsAt = startedAt + WASH_MS;
    const tick = () => {
      const now = Date.now();
      const p = Math.min(1, Math.max(0, (now - startedAt) / WASH_MS));
      setProgress(p * 100);
      setElapsedMs(Math.max(0, now - startedAt));
      if (now >= endsAt) {
        setProgress(100);
        onDone();
        return false;
      }
      return true;
    };
    if (!tick()) return;
    const id = window.setInterval(() => {
      if (!tick()) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [onDone]);

  const percent = Math.round(progress);
  const durationMin = Math.floor(elapsedMs / 60_000);
  const durationSec = Math.floor((elapsedMs % 60_000) / 1000);
  const durationLabel =
    durationMin > 0
      ? `${durationMin} мин ${durationSec} с`
      : `${durationSec} с`;

  const rows = [
    { label: t("common.wash", "Мойка"), value: stationTitle },
    { label: t("payment.tariff", "Тариф"), value: tariffTitle },
    { label: t("payment.to_pay", "Стоимость"), value: `${price} ₸` },
    { label: t("ev.charging_duration", "Длительность"), value: durationLabel },
  ];

  return (
    <div className="csv csv--refined">
      <section className="profile-card csv-shell">
        <div className="csv-shell__head">
          <span className="csv-ev-badge csv-ev-badge--wash csv-ev-badge--inline" aria-hidden>
            <WashIcon />
            <span>{t("common.wash", "Мойка")}</span>
          </span>
        </div>
        <div className="csv-shell__body">
          <ServiceFillProgress percent={percent} variant="wash" />
          <p className="csv-status csv-status--center">
            {t("wash.in_progress", "Идёт мойка")}
          </p>
        </div>
      </section>

      <section className="profile-card csv-params">
        <div className="profile-card__balance">
          <p className="csv-params__title">
            {t("wash.params_title", "Параметры мойки")}
          </p>
          {rows.map((row) => (
            <div key={row.label} className="profile-card__balance-item csv-params__row">
              <p className="profile-card__balance-label">{row.label}</p>
              <p className="profile-card__balance-value">{row.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
