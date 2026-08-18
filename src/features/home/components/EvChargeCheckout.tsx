"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Station, StationChargerStand, StationConnectorPort } from "@/data/stations";
import { useT } from "@/hooks/useT";
import { updateEvSession } from "@/lib/api/evSessions";
import type { EvChargeStep } from "./EvChargeFlow";

export const CHARGE_MS = 60_000;

export type EvCheckoutLimits = {
  tab: "price" | "charge" | "time";
  priceLimit: number;
  chargeTo: number;
  minutes: number;
};

type EvChargeCheckoutProps = {
  step: EvChargeStep;
  onStepChange: (step: EvChargeStep) => void;
  port: StationConnectorPort;
  stand: StationChargerStand;
  station: Station;
  limits: EvCheckoutLimits;
  /** Unix ms — если уже идёт сессия (после minimize) */
  chargeEndsAt?: number | null;
  onChargeEndsAt?: (endsAt: number) => void;
  onPayNavigate?: () => void;
  dbSessionId?: number | null;
};

function IconOk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 12.5 4 4 9-9.5" />
    </svg>
  );
}

export default function EvChargeCheckout({
  step,
  onStepChange,
  port,
  stand,
  station,
  limits,
  chargeEndsAt = null,
  onChargeEndsAt,
  onPayNavigate,
  dbSessionId = null,
}: EvChargeCheckoutProps) {
  const t = useT();
  const router = useRouter();
  const [cancelNote, setCancelNote] = useState(false);
  const [payingNav, setPayingNav] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const completedRef = useRef(false);

  const amount = useMemo(() => {
    if (limits.tab === "price") return limits.priceLimit;
    if (limits.tab === "time") {
      return Math.min(20_000, Math.max(500, limits.minutes * 80));
    }
    return Math.min(20_000, Math.max(500, Math.round(limits.chargeTo * 50)));
  }, [limits]);

  const limitLabel = useMemo(() => {
    if (limits.tab === "price") return `${amount.toLocaleString("ru-RU")} ₸`;
    if (limits.tab === "time") return `${limits.minutes} мин`;
    return `${limits.chargeTo}%`;
  }, [limits, amount]);

  const modeLabel = useMemo(() => {
    if (limits.tab === "price") return t("ev.tab_price", "Цена");
    if (limits.tab === "time") return t("ev.tab_time", "Время");
    return t("ev.tab_charge", "Заряд");
  }, [limits.tab, t]);

  /** Целевой % на экране: для режима «Заряд» — выбранный лимит, иначе 100 */
  const targetPercent = limits.tab === "charge" ? limits.chargeTo : 100;
  const displayPercent = Math.min(
    targetPercent,
    Math.round((chargeProgress / 100) * targetPercent),
  );

  function goToPayment() {
    if (payingNav || dbSessionId == null) return;
    setPayingNav(true);
    onPayNavigate?.();
    router.push(`/payment/ev-charge?session=${dbSessionId}`);
  }

  useEffect(() => {
    if (step !== "charging") return;
    setCancelNote(false);
    setPayingNav(false);
    completedRef.current = false;

    let endsAt = chargeEndsAt;
    if (endsAt == null) {
      endsAt = Date.now() + CHARGE_MS;
      onChargeEndsAt?.(endsAt);
    }

    const duration = CHARGE_MS;
    const startedAt = endsAt - duration;

    const tickProgress = () => {
      const now = Date.now();
      const p = Math.min(1, Math.max(0, (now - startedAt) / duration));
      setChargeProgress(p * 100);
      if (now >= endsAt) {
        setChargeProgress(100);
        onStepChange("charged_ok");
        return false;
      }
      return true;
    };

    if (!tickProgress()) return;

    const tick = window.setInterval(() => {
      if (!tickProgress()) window.clearInterval(tick);
    }, 100);
    return () => window.clearInterval(tick);
  }, [step, chargeEndsAt, onStepChange, onChargeEndsAt]);

  useEffect(() => {
    if (step !== "charged_ok" || !dbSessionId || completedRef.current) return;
    completedRef.current = true;
    void updateEvSession(dbSessionId, {
      status: "pending",
      amount,
    }).catch(() => {
      /* история уже создана при старте */
    });
  }, [step, dbSessionId, amount]);

  useEffect(() => {
    if (!cancelNote) return;
    const tmr = window.setTimeout(() => setCancelNote(false), 3200);
    return () => window.clearTimeout(tmr);
  }, [cancelNote]);

  if (step === "charging") {
    const r = 40;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - chargeProgress / 100);

    return (
      <div className="ev-flow ev-checkout ev-checkout--charging">
        <div
          className="ev-charge-anim"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={targetPercent}
          aria-valuenow={displayPercent}
          aria-label={t("ev.charging_progress", "Прогресс зарядки")}
        >
          <div className="ev-charge-anim__ring">
            <svg viewBox="0 0 96 96" aria-hidden>
              <circle className="ev-charge-anim__track" cx="48" cy="48" r={r} />
              <circle
                className="ev-charge-anim__value"
                cx="48"
                cy="48"
                r={r}
                style={{
                  strokeDasharray: `${c}`,
                  strokeDashoffset: `${offset}`,
                }}
              />
            </svg>
            <span className="ev-charge-anim__pct">{displayPercent}%</span>
          </div>
        </div>

        <h2 className="ev-flow__title">
          {t("ev.charging_title", "Идёт зарядка")}
        </h2>
        <p className="ev-flow__hint">
          {t("ev.charging_wait", "Подождите, идёт зарядка…")}
        </p>
        <p className="ev-flow__port">
          {modeLabel}
          <span aria-hidden> · </span>
          {limitLabel}
        </p>

        {cancelNote ? (
          <div className="ev-checkout__note" role="alert">
            {t(
              "ev.cancel_stub",
              "Ой, стоп — сорри, этого функционала пока нет. Дождитесь окончания.",
            )}
          </div>
        ) : null}

        <div className="ev-flow__actions">
          <button
            type="button"
            className="theme-button-secondary w-full"
            onClick={() => setCancelNote(true)}
          >
            {t("common.cancel", "Отменить")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-flow ev-checkout ev-checkout--status">
      <div className="ev-checkout__badge is-ok" aria-hidden>
        <IconOk />
      </div>
      <h2 className="ev-flow__title">{t("ev.charged_ok_title", "Всё ок")}</h2>
      <p className="ev-flow__hint">
        {t(
          "ev.charged_ok_text",
          "Сессия готова. Нажмите «Оплатить», когда будете готовы.",
        )}
      </p>
      <div className="ev-flow__actions">
        <button
          type="button"
          className="theme-button w-full"
          disabled={payingNav}
          onClick={goToPayment}
        >
          {t("ev.pay", "Оплатить")}
        </button>
      </div>
    </div>
  );
}
