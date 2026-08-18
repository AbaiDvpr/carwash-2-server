"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { StationChargerStand, StationConnectorPort } from "@/data/stations";
import { formatPowerKw, formatPricePerKwh } from "@/features/map/evConnectors";
import { useT } from "@/hooks/useT";
import { ApiError } from "@/lib/api";
import { parseEvStationId } from "@/lib/api/ev";
import { startEvSession } from "@/lib/api/evSessions";
import EvChargeCheckout, {
  CHARGE_MS,
  type EvCheckoutLimits,
} from "./EvChargeCheckout";
import type { Station } from "@/data/stations";

export type EvChargeStep =
  | "init"
  | "connect"
  | "setup"
  | "charging"
  | "charged_ok";

export type EvPhotoHeader =
  | { mode: "connect" }
  | { mode: "setup"; title: string; meta: string };

const POST_SETUP_STEPS: EvChargeStep[] = ["charging", "charged_ok"];

const INIT_MS = 4000;
const MIN_PRICE_TG = 500;
const MAX_PRICE_TG = 20_000;
const MAX_MINUTES = 120;

const CONNECT_CHECKS = [
  "Убедитесь, что электромобиль в режиме парковки и отключен",
  "Плотно подключите коннектор до характерного щелчка блокировки",
  "Не используйте станцию при обнаружении повреждений кабеля либо коннектора",
  "Избегайте наезда колесами электромобиля на кабель зарядной станции",
] as const;

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 12.5 4 4 9-9.5" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 10.5V16M12 7.75h.01" />
    </svg>
  );
}

function formatTg(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₸`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type EvChargeFlowProps = {
  port: StationConnectorPort;
  stand: StationChargerStand;
  station: Station;
  step: EvChargeStep;
  onStepChange: (step: EvChargeStep) => void;
  onRestartInit: () => void;
  onHidePhoto?: (hide: boolean) => void;
  onPhotoHeader?: (header: EvPhotoHeader | null) => void;
  chargeEndsAt?: number | null;
  onChargeEndsAt?: (endsAt: number) => void;
  onPayNavigate?: () => void;
  dbSessionId?: number | null;
  onDbSessionId?: (id: number) => void;
};

export default function EvChargeFlow({
  port,
  stand,
  station,
  step,
  onStepChange,
  onRestartInit,
  onHidePhoto,
  onPhotoHeader,
  chargeEndsAt = null,
  onChargeEndsAt,
  onPayNavigate,
  dbSessionId = null,
  onDbSessionId,
}: EvChargeFlowProps) {
  const t = useT();
  const [progress, setProgress] = useState(0);
  const [initKey, setInitKey] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [chargeTo, setChargeTo] = useState(100);
  const [chargeDraft, setChargeDraft] = useState("100");
  const [chargeFull, setChargeFull] = useState(true);
  const [priceLimit, setPriceLimit] = useState(5_000);
  const [priceDraft, setPriceDraft] = useState("5000");
  const [minutes, setMinutes] = useState(30);
  const [minutesDraft, setMinutesDraft] = useState("30");
  const [setupTab, setSetupTab] = useState<"price" | "charge" | "time">("charge");
  const [infoOpen, setInfoOpen] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [localSessionId, setLocalSessionId] = useState<number | null>(dbSessionId);

  useEffect(() => {
    if (step !== "init") return;
    setProgress(0);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / INIT_MS);
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(tick);
        onStepChange(attempt >= 2 ? "setup" : "connect");
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [step, initKey, attempt, onStepChange]);

  useEffect(() => {
    // Фото станции оставляем на зарядке/готовности — только коннект без фото
    onHidePhoto?.(false);
    return () => onHidePhoto?.(false);
  }, [step, onHidePhoto]);

  useEffect(() => {
    if (chargeFull) {
      setChargeTo(100);
      setChargeDraft("100");
    }
  }, [chargeFull]);

  useEffect(() => {
    setPriceDraft(String(priceLimit));
  }, [priceLimit]);

  useEffect(() => {
    setChargeDraft(String(chargeTo));
  }, [chargeTo]);

  useEffect(() => {
    setMinutesDraft(String(minutes));
  }, [minutes]);

  const checkoutLimits: EvCheckoutLimits = useMemo(
    () => ({
      tab: setupTab,
      priceLimit,
      chargeTo,
      minutes,
    }),
    [setupTab, priceLimit, chargeTo, minutes],
  );

  function commitPriceDraft(raw: string) {
    const digits = raw.replace(/\D+/g, "");
    const parsed = Number(digits || 0);
    const next = clamp(parsed, MIN_PRICE_TG, MAX_PRICE_TG);
    setPriceLimit(next);
    setPriceDraft(String(next));
  }

  function setPrice(next: number) {
    const value = clamp(Math.round(next), MIN_PRICE_TG, MAX_PRICE_TG);
    setPriceLimit(value);
    setPriceDraft(String(value));
  }

  function commitChargeDraft(raw: string) {
    const digits = raw.replace(/\D+/g, "");
    const parsed = Number(digits || 0);
    const next = clamp(parsed, 5, 100);
    setChargeFull(next >= 100);
    setChargeTo(next);
    setChargeDraft(String(next));
  }

  function setCharge(next: number) {
    const value = clamp(Math.round(next), 5, 100);
    setChargeFull(value >= 100);
    setChargeTo(value);
    setChargeDraft(String(value));
  }

  function commitMinutesDraft(raw: string) {
    const digits = raw.replace(/\D+/g, "");
    const parsed = Number(digits || 0);
    const next = clamp(parsed, 1, MAX_MINUTES);
    setMinutes(next);
    setMinutesDraft(String(next));
  }

  function setMinutesSafe(next: number) {
    const value = clamp(Math.round(next), 1, MAX_MINUTES);
    setMinutes(value);
    setMinutesDraft(String(value));
  }

  const priceHint = useMemo(() => {
    const price = port.pricePerKwh ?? stand.pricePerKwh;
    return price != null ? formatPricePerKwh(price) : "—";
  }, [port.pricePerKwh, stand.pricePerKwh]);

  const powerHint = useMemo(() => {
    const power = port.powerKw ?? stand.powerKw;
    return power != null ? formatPowerKw(power) : "—";
  }, [port.powerKw, stand.powerKw]);

  useEffect(() => {
    if (step === "connect") {
      onPhotoHeader?.({ mode: "connect" });
    } else if (step === "setup") {
      onPhotoHeader?.({
        mode: "setup",
        title: `${port.label}/${stand.title}`,
        meta: `${priceHint} · ${powerHint}`,
      });
    } else if (step === "charging" || step === "charged_ok") {
      const modeLabel =
        setupTab === "price"
          ? t("ev.tab_price", "Цена")
          : setupTab === "time"
            ? t("ev.tab_time", "Время")
            : t("ev.tab_charge", "Заряд");
      const limit =
        setupTab === "price"
          ? formatTg(priceLimit)
          : setupTab === "time"
            ? `${minutes} мин`
            : `${chargeTo}%`;
      onPhotoHeader?.({
        mode: "setup",
        title: station.address || station.name,
        meta: `${port.label}/${stand.title} · ${modeLabel} ${limit}`,
      });
    } else {
      onPhotoHeader?.(null);
    }
    return () => onPhotoHeader?.(null);
  }, [
    step,
    port.label,
    stand.title,
    priceHint,
    powerHint,
    setupTab,
    priceLimit,
    minutes,
    chargeTo,
    station.address,
    station.name,
    t,
    onPhotoHeader,
  ]);

  const confirmSub = useMemo(() => {
    const value =
      setupTab === "price"
        ? formatTg(priceLimit)
        : setupTab === "time"
          ? `${minutes} мин`
          : `${chargeTo}%`;
    return t("ev.confirm_charge_on", "Зарядить на {{value}}").replace(
      "{{value}}",
      value,
    );
  }, [setupTab, priceLimit, minutes, chargeTo, t]);

  const plannedAmount = useMemo(() => {
    if (setupTab === "price") return priceLimit;
    if (setupTab === "time") {
      return Math.min(20_000, Math.max(500, minutes * 80));
    }
    return Math.min(20_000, Math.max(500, Math.round(chargeTo * 50)));
  }, [setupTab, priceLimit, minutes, chargeTo]);

  const limitValue = useMemo(() => {
    if (setupTab === "price") return priceLimit;
    if (setupTab === "time") return minutes;
    return chargeTo;
  }, [setupTab, priceLimit, minutes, chargeTo]);

  async function confirmStart() {
    if (starting) return;
    setStarting(true);
    setStartError(null);

    const locationId = parseEvStationId(String(station.id));
    if (locationId == null) {
      setStartError(t("ev.start_bad_station", "Некорректная станция"));
      setStarting(false);
      return;
    }

    try {
      const session = await startEvSession({
        location_id: locationId,
        pistol_id: port.id,
        charger_id: stand.id,
        limit_mode: setupTab,
        limit_value: limitValue,
        amount: plannedAmount,
        duration_seconds: Math.round(CHARGE_MS / 1000),
        meta: {
          stand_title: stand.title,
          port_label: port.label,
          power_kw: port.powerKw ?? stand.powerKw,
          price_per_kwh: port.pricePerKwh ?? stand.pricePerKwh,
          address: station.address || station.name,
          station_name: station.name,
        },
      });
      setLocalSessionId(session.id);
      onDbSessionId?.(session.id);
      onStepChange("charging");
    } catch (err) {
      const body =
        err instanceof ApiError
          ? (err.body as { message?: string; errors?: Record<string, string[]> })
          : null;
      const message =
        body?.errors?.pistol_id?.[0] ??
        body?.errors?.location_id?.[0] ??
        body?.message ??
        t("ev.start_error", "Не удалось запустить зарядку");
      setStartError(message);
    } finally {
      setStarting(false);
    }
  }

  function restart() {
    setAttempt((n) => n + 1);
    setInitKey((k) => k + 1);
    onRestartInit();
  }

  if (POST_SETUP_STEPS.includes(step)) {
    return (
      <EvChargeCheckout
        step={step}
        onStepChange={onStepChange}
        port={port}
        stand={stand}
        station={station}
        limits={checkoutLimits}
        chargeEndsAt={chargeEndsAt}
        onChargeEndsAt={onChargeEndsAt}
        onPayNavigate={onPayNavigate}
        dbSessionId={localSessionId}
      />
    );
  }

  if (step === "init") {
    const pct = Math.round(progress * 100);
    return (
      <div className="ev-flow ev-flow--init" role="status" aria-live="polite">
        <div className="ev-flow__ring" aria-hidden>
          <svg viewBox="0 0 96 96">
            <circle className="ev-flow__ring-track" cx="48" cy="48" r="40" />
            <circle
              className="ev-flow__ring-value"
              cx="48"
              cy="48"
              r="40"
              style={{
                strokeDasharray: `${2 * Math.PI * 40}`,
                strokeDashoffset: `${2 * Math.PI * 40 * (1 - progress)}`,
              }}
            />
          </svg>
          <span className="ev-flow__ring-pct">{pct}%</span>
        </div>
        <h2 className="ev-flow__title">
          {t("ev.init_title", "Инициализация со станцией")}
        </h2>
        <p className="ev-flow__hint">
          {attempt >= 2
            ? t("ev.init_hint_retry", "Повторное подключение к коннектору…")
            : t(
                "ev.init_hint",
                "Подключаемся к коннектору… Это займёт несколько секунд",
              )}
        </p>
        <p className="ev-flow__port">
          {port.label}
          <span aria-hidden> · </span>
          {powerHint}
        </p>
      </div>
    );
  }

  if (step === "connect") {
    return (
      <div className="ev-flow ev-flow--connect">
        <h2 className="ev-flow__title">
          {t("ev.connect_title", "Подключите коннектор к электромобилю")}
        </h2>

        <p className="ev-flow__section-label">
          {t("ev.connect_ensure", "Убедитесь, что:")}
        </p>
        <ul className="ev-flow__checks">
          {CONNECT_CHECKS.map((text) => (
            <li key={text} className="ev-flow__check">
              <span className="ev-flow__check-icon">
                <IconCheck />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="ev-flow__actions">
          <button type="button" className="theme-button w-full" onClick={restart}>
            {t("common.retry", "Повторить")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-flow ev-flow--setup">
      <div
        className="ev-flow__tabs"
        role="tablist"
        aria-label={t("ev.setup_tabs", "Параметры")}
      >
        {(
          [
            ["price", t("ev.tab_price", "Цена")],
            ["charge", t("ev.tab_charge", "Заряд")],
            ["time", t("ev.tab_time", "Время")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={setupTab === id}
            className={`ev-flow__tab${setupTab === id ? " is-active" : ""}`}
            onClick={() => setSetupTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {setupTab === "price" ? (
        <div className="ev-flow__panel">
          <div className="ev-flow__slider-row">
            <span className="ev-flow__slider-label">
              {t("ev.price_to", "Лимит оплаты")}
            </span>
            <label className="ev-flow__money">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="ev-flow__money-input"
                value={priceDraft}
                aria-label={t("ev.price_to", "Лимит оплаты")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D+/g, "").slice(0, 5);
                  setPriceDraft(digits);
                }}
                onBlur={() => commitPriceDraft(priceDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
              />
              <span className="ev-flow__money-suffix" aria-hidden>
                ₸
              </span>
            </label>
          </div>
          <input
            type="range"
            min={MIN_PRICE_TG}
            max={MAX_PRICE_TG}
            step={100}
            value={clamp(priceLimit, MIN_PRICE_TG, MAX_PRICE_TG)}
            className="ev-flow__slider"
            aria-label={t("ev.price_to", "Лимит оплаты")}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <div className="ev-flow__ticks" aria-hidden>
            <span>500 ₸</span>
            <span>10 000 ₸</span>
            <span>20 000 ₸</span>
          </div>
          <div className="ev-flow__quick">
            {[1_000, 3_000, 5_000, 10_000, 20_000].map((amount) => (
              <button
                key={amount}
                type="button"
                className={`ev-flow__quick-chip${priceLimit === amount ? " is-active" : ""}`}
                onClick={() => setPrice(amount)}
              >
                {amount >= 1000
                  ? `${(amount / 1000).toLocaleString("ru-RU")}k`
                  : amount}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {setupTab === "charge" ? (
        <div className="ev-flow__panel">
          <div className="ev-flow__slider-row">
            <span className="ev-flow__slider-label">
              {t("ev.charge_to", "Зарядить до")}
            </span>
            <label className="ev-flow__money">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="ev-flow__money-input"
                value={chargeDraft}
                aria-label={t("ev.charge_to", "Зарядить до")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D+/g, "").slice(0, 3);
                  setChargeDraft(digits);
                  if (digits) setChargeFull(false);
                }}
                onBlur={() => commitChargeDraft(chargeDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <span className="ev-flow__money-suffix" aria-hidden>
                %
              </span>
            </label>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={chargeTo}
            className="ev-flow__slider"
            aria-label={t("ev.charge_to", "Зарядить до")}
            onChange={(e) => setCharge(Number(e.target.value))}
          />
          <div className="ev-flow__ticks" aria-hidden>
            {[0, 20, 40, 60, 80, 100].map((n) => (
              <span key={n}>{n}%</span>
            ))}
          </div>

          <div className="ev-flow__toggle-row">
            <span className="ev-flow__toggle-label" id="ev-charge-full-label">
              {t("ev.charge_full", "Зарядить полностью")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={chargeFull}
              aria-labelledby="ev-charge-full-label"
              className={`ev-flow__switch${chargeFull ? " is-on" : ""}`}
              onClick={() => setChargeFull((v) => !v)}
            >
              <span className="ev-flow__switch-knob" />
            </button>
          </div>
        </div>
      ) : null}

      {setupTab === "time" ? (
        <div className="ev-flow__panel">
          <div className="ev-flow__slider-row">
            <span className="ev-flow__slider-label">
              {t("ev.time_to", "Заряжать")}
            </span>
            <label className="ev-flow__money">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                className="ev-flow__money-input"
                value={minutesDraft}
                aria-label={t("ev.time_to", "Заряжать")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D+/g, "").slice(0, 3);
                  setMinutesDraft(digits);
                }}
                onBlur={() => commitMinutesDraft(minutesDraft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <span className="ev-flow__money-suffix" aria-hidden>
                {t("ev.minutes_short", "мин")}
              </span>
            </label>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_MINUTES}
            step={1}
            value={clamp(minutes, 1, MAX_MINUTES)}
            className="ev-flow__slider"
            aria-label={t("ev.time_to", "Заряжать")}
            onChange={(e) => setMinutesSafe(Number(e.target.value))}
          />
          <div className="ev-flow__ticks" aria-hidden>
            <span>1</span>
            <span>30</span>
            <span>60</span>
            <span>90</span>
            <span>{MAX_MINUTES}</span>
          </div>
        </div>
      ) : null}

      {infoOpen ? (
        <div className="ev-flow__info">
          <span className="ev-flow__info-icon" aria-hidden>
            <IconInfo />
          </span>
          <div className="ev-flow__info-body">
            <p className="ev-flow__info-title">
              {t("ev.pay_title", "Оплата заказа")}
            </p>
            <p className="ev-flow__info-text">
              {t(
                "ev.pay_text",
                "Оплата будет производиться по завершению заряда. Заказ можно будет оплатить картой/абонементом",
              )}
            </p>
          </div>
          <button
            type="button"
            className="ev-flow__info-close"
            aria-label={t("common.close", "Закрыть")}
            onClick={() => setInfoOpen(false)}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="ev-flow__actions">
        {startError ? (
          <p className="ev-flow__cap-hint" role="alert">
            {startError}
          </p>
        ) : null}
        <button
          type="button"
          className="theme-button w-full ev-flow__confirm"
          disabled={starting}
          onClick={() => void confirmStart()}
        >
          <span>
            {starting
              ? t("ev.starting", "Запускаем…")
              : t("ev.confirm", "Подтвердить")}
          </span>
          <span className="ev-flow__confirm-sub">{confirmSub}</span>
        </button>
      </div>
    </div>
  );
}
