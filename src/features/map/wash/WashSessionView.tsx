"use client";

import { useEffect, useRef, useState } from "react";
import ServiceFillProgress from "@/features/map/charging/ServiceFillProgress";
import { useT } from "@/hooks/useT";
import { fetchCwSession } from "@/lib/api/sessions";
import { WASH_STATUS_POLL_MS } from "@/features/map/wash/WashPrepareTimer";
import { formatCarPlate } from "@/features/map/wash/formatCarPlate";
import "@/features/map/charging/charging-session-variants.css";
import "./wash-session.css";

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function parseStartMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

type WashSessionViewProps = {
  sessionId: number;
  stationTitle: string;
  tariffTitle: string;
  price: number;
  washerId?: number | null;
  bayNumber?: number | null;
  /** ISO start_at с бэка — длительность от него, не с момента открытия страницы */
  startAt?: string | null;
  carPlate?: string | null;
  onDone: (info?: { status: string }) => void;
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
  bayNumber = null,
  startAt = null,
  carPlate = null,
  onDone,
}: WashSessionViewProps) {
  const t = useT();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [displayTariff, setDisplayTariff] = useState(tariffTitle);
  const [displayPrice, setDisplayPrice] = useState(price);
  const [displayPlate, setDisplayPlate] = useState<string | null>(
    carPlate?.trim() ? carPlate.trim() : null,
  );
  const [statusLabel, setStatusLabel] = useState(
    t("wash.car_washing", "Машина моется"),
  );
  const [boxNumber, setBoxNumber] = useState<number | null>(
    washerId ?? bayNumber,
  );
  const startMsRef = useRef<number | null>(parseStartMs(startAt));
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setDisplayTariff(tariffTitle);
  }, [tariffTitle]);

  useEffect(() => {
    if (Number.isFinite(price) && price > 0) setDisplayPrice(price);
  }, [price]);

  useEffect(() => {
    if (carPlate?.trim()) setDisplayPlate(carPlate.trim());
  }, [carPlate]);

  useEffect(() => {
    if (washerId != null) setBoxNumber(washerId);
    else if (bayNumber != null) setBoxNumber(bayNumber);
  }, [washerId, bayNumber]);

  useEffect(() => {
    const ms = parseStartMs(startAt);
    if (ms != null) startMsRef.current = ms;
  }, [startAt]);

  useEffect(() => {
    const tick = () => {
      const start = startMsRef.current;
      if (start == null) {
        setElapsedMs(0);
        return;
      }
      setElapsedMs(Math.max(0, Date.now() - start));
    };
    tick();
    const clockId = window.setInterval(tick, 250);
    return () => window.clearInterval(clockId);
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;

    const poll = async () => {
      try {
        const { session } = await fetchCwSession(sessionId);
        if (cancelled || doneRef.current) return;

        const status = (session.status ?? "").toLowerCase();
        if (session.washer_id != null) setBoxNumber(session.washer_id);
        else if (session.bay_number != null) setBoxNumber(session.bay_number);

        const startMs = parseStartMs(session.start_at);
        if (startMs != null) startMsRef.current = startMs;

        const nextPrice = Number(
          session.payment_display_amount ?? session.payment_amount,
        );
        if (Number.isFinite(nextPrice) && nextPrice > 0) {
          setDisplayPrice(nextPrice);
        }
        if (session.tariff_title) {
          setDisplayTariff(session.tariff_title);
        }
        if (session.car_plate) {
          setDisplayPlate(session.car_plate);
        }

        if (status === "completed") {
          doneRef.current = true;
          setStatusLabel(t("wash.done_title", "Мойка завершена"));
          onDoneRef.current({ status: "completed" });
          return;
        }

        if (status === "cancelled" || status === "error") {
          doneRef.current = true;
          setStatusLabel(
            status === "error"
              ? t("wash.session_failed", "Сессия мойки завершилась с ошибкой")
              : t("wash.session_cancelled", "Мойка отменена"),
          );
          onDoneRef.current({ status });
          return;
        }

        if (status === "invited") {
          setStatusLabel(t("wash.invited_title", "Вас ждут"));
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
  const minUnit = t("common.minutes_short", "мин");
  const secUnit = t("common.seconds_short", "с");
  const durationLabel =
    durationMin > 0
      ? `${durationMin} ${minUnit} ${durationSec} ${secUnit}`
      : `${durationSec} ${secUnit}`;

  const priceLabel = Number.isFinite(displayPrice)
    ? `${Math.round(displayPrice)} ₸`
    : "—";

  const plateLabel = formatCarPlate(displayPlate);

  const rows = [
    { label: t("common.wash", "Мойка"), value: stationTitle },
    ...(plateLabel
      ? [{ label: t("wash.your_car", "Ваша машина"), value: plateLabel }]
      : []),
    { label: t("payment.tariff", "Тариф"), value: displayTariff || "—" },
    { label: t("payment.to_pay", "Стоимость"), value: priceLabel },
    ...(boxNumber != null
      ? [{ label: t("wash.box", "Бокс"), value: `№${boxNumber}` }]
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
          {plateLabel ? (
            <p className="cw-car-plate" title={t("wash.your_car", "Ваша машина")}>
              {plateLabel}
            </p>
          ) : null}
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
