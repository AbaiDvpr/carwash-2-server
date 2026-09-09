"use client";

import { useEffect, useRef, useState } from "react";
import ServiceFillProgress from "@/features/map/charging/ServiceFillProgress";
import { useT } from "@/hooks/useT";
import { fetchCwSession } from "@/lib/api/sessions";
import { WASH_STATUS_POLL_MS } from "@/features/map/wash/WashPrepareTimer";
import "@/features/map/charging/charging-session-variants.css";
import "./wash-session.css";

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

type WashSessionViewProps = {
  sessionId: number;
  stationTitle: string;
  tariffTitle: string;
  price: number;
  washerId?: number | null;
  onDone: () => void;
};

/**
 * Экран мойки: ждём completed/error только из API (event → статус в БД).
 * Прогресс в % не показываем — только анимация заливки туда-обратно.
 */
export default function WashSessionView({
  sessionId,
  stationTitle,
  tariffTitle,
  price,
  washerId = null,
  onDone,
}: WashSessionViewProps) {
  const t = useT();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusLabel, setStatusLabel] = useState(
    t("wash.car_washing", "Машина моется"),
  );
  const [boxId, setBoxId] = useState<number | null>(washerId);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAt));
    tick();
    const clockId = window.setInterval(tick, 250);
    return () => window.clearInterval(clockId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;

    const poll = async () => {
      try {
        const { session } = await fetchCwSession(sessionId);
        if (cancelled || doneRef.current) return;

        const status = (session.status ?? "").toLowerCase();
        if (session.washer_id != null) setBoxId(session.washer_id);

        // Завершение только по статусу из БД (event с оборудования / админки)
        if (status === "completed") {
          doneRef.current = true;
          setStatusLabel(t("wash.done_title", "Мойка завершена"));
          onDoneRef.current();
          return;
        }

        if (status === "cancelled" || status === "error") {
          doneRef.current = true;
          setStatusLabel(
            session.status_ru ||
              t("wash.session_failed", "Сессия мойки завершилась с ошибкой"),
          );
          onDoneRef.current();
          return;
        }

        if (status === "invited") {
          setStatusLabel(t("wash.invited_title", "Вас пригласили"));
        } else {
          setStatusLabel(t("wash.car_washing", "Машина моется"));
        }
      } catch {
        /* следующий тик */
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), WASH_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, t]);

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
    ...(boxId != null
      ? [{ label: t("wash.box", "Бокс"), value: `№${boxId}` }]
      : []),
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
          <ServiceFillProgress
            percent={0}
            variant="wash"
            showPercent={false}
            indeterminate
          />
          <p className="csv-status csv-status--center">{statusLabel}</p>
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
