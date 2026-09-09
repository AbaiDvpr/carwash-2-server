"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { parseEvStationId } from "@/lib/api/ev";
import { payCarWash, payEv, payFromBalance } from "@/lib/api/payments";
import { fetchCwSession } from "@/lib/api/sessions";
import { useT, useLocale } from "@/hooks/useT";
import { localizeWashTariff } from "@/lib/api/cw";
import { formatBalance, useUserBalance } from "@/features/profile/hooks/useUserBalance";
import {
  fetchAbonementCards,
  washAbonements,
  type AbonementCard,
} from "@/features/profile/abonements";
import WashPrepareTimer from "@/features/map/wash/WashPrepareTimer";
import WashSessionView from "@/features/map/wash/WashSessionView";
import "@/features/profile/components/profile.css";
import "@/features/map/charging/charging-session-variants.css";
import "@/features/map/charging/details-charging.css";
import "../ev-charge-payment.css";
import "../car-wash-payment.css";

type CarWashPaymentProps = {
  station: Station;
  tariff?: string | null;
};

type PayStep =
  | "form"
  | "processing"
  | "preparing"
  | "washing"
  | "success"
  | "error";

function IconOk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 12.5 4 4 9-9.5" />
    </svg>
  );
}

function IconFail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
      <path strokeLinecap="round" d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked ? "is-on" : "",
      ].join(" ")}
      aria-hidden
    >
      {checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

function paymentErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const fieldError =
      body?.errors?.amount?.[0] ??
      body?.errors?.tariff_id?.[0] ??
      body?.errors?.location_id?.[0] ??
      body?.errors?.abonement_id?.[0];
    if (fieldError) return fieldError;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function CarWashPayment({
  station,
  tariff = null,
}: CarWashPaymentProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeSessionParam = searchParams.get("session");
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useUserBalance();
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(
    () => tariff,
  );
  const [paySource, setPaySource] = useState<"balance" | string>("balance");
  const [abonCards, setAbonCards] = useState<AbonementCard[]>([]);
  const [step, setStep] = useState<PayStep>(() =>
    resumeSessionParam ? "processing" : "form",
  );
  const [payError, setPayError] = useState<string | null>(null);
  const [washSessionId, setWashSessionId] = useState<number | null>(null);
  const [washSessionStatus, setWashSessionStatus] = useState<string>("pending");
  const [washWasherId, setWashWasherId] = useState<number | null>(null);
  const resumeRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cards = await fetchAbonementCards();
        if (!cancelled) setAbonCards(washAbonements(cards));
      } catch {
        if (!cancelled) setAbonCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Возврат из «Мои услуги» к активной мойке (?session=id).
  useEffect(() => {
    const raw = resumeSessionParam;
    if (!raw) return;

    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setStep("form");
      return;
    }

    const requestId = ++resumeRequestRef.current;
    let cancelled = false;
    setStep("processing");

    void (async () => {
      try {
        const { session } = await fetchCwSession(id);
        if (cancelled || requestId !== resumeRequestRef.current) return;

        const status = (session.status ?? "pending").toLowerCase();
        setWashSessionId(session.id);
        setWashSessionStatus(status);
        setWashWasherId(session.washer_id ?? null);

        if (status === "completed") {
          setStep("success");
          return;
        }
        if (status === "in_progress") {
          setStep("washing");
          return;
        }
        // pending / invited — экран очереди / приглашения
        setStep("preparing");
      } catch {
        if (cancelled || requestId !== resumeRequestRef.current) return;
        setPayError(
          t("wash.resume_failed", "Не удалось открыть активную мойку"),
        );
        setStep("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeSessionParam, t]);

  const tariffs = station.tariff.map((tariff) => localizeWashTariff(tariff, locale));
  const selected = tariffs.find((tariff) => {
    const key = tariff.id != null ? String(tariff.id) : tariff.title;
    return key === selectedTariffKey;
  });
  const balanceValue = balance ?? 0;
  const payWithAbonement = paySource !== "balance";
  const canAffordBalance =
    selected != null && Number.isFinite(balanceValue) && balanceValue >= selected.price;
  const canAfford =
    selected != null && (payWithAbonement || canAffordBalance);
  const locked =
    step === "processing" ||
    step === "preparing" ||
    step === "washing" ||
    step === "success";

  const goMap = () => router.push("/");
  const finishWash = useCallback(() => setStep("success"), []);
  const startWash = useCallback(() => setStep("washing"), []);

  const handleBack = () => {
    if (step === "processing") {
      return;
    }
    if (step === "preparing" || step === "washing" || step === "success") {
      goMap();
      return;
    }
    if (step === "error") {
      setStep("form");
      setPayError(null);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    goMap();
  };

  const handlePay = async () => {
    if (!selected || !canAfford) return;
    setPayError(null);
    setStep("processing");

    try {
      const description = `${station.paymentTitle} · ${selected.title}`;
      const evId = parseEvStationId(station.id);
      const cwId = /^\d+$/.test(station.id) ? Number.parseInt(station.id, 10) : null;
      const abonementId =
        paySource !== "balance" ? Number.parseInt(paySource, 10) : undefined;
      const abonPayload =
        abonementId != null && Number.isFinite(abonementId)
          ? { abonement_id: abonementId }
          : {};

      if (evId != null && selected.id != null) {
        await payEv({
          location_id: evId,
          tariff_id: selected.id,
          description,
          ...abonPayload,
        });
        await refreshBalance();
        setStep("preparing");
      } else if (cwId != null && Number.isFinite(cwId) && selected.id != null) {
        const paid = await payCarWash({
          location_id: cwId,
          tariff_id: selected.id,
          description,
          ...abonPayload,
        });
        const sessionId = paid.session?.id ?? null;
        if (sessionId == null) {
          throw new Error(t("payment.failed", "Не удалось оплатить"));
        }
        setWashSessionId(sessionId);
        setWashSessionStatus(paid.session?.status ?? "pending");
        setWashWasherId(
          paid.session?.washer_id ?? paid.bay?.washer_id ?? null,
        );
        await refreshBalance();
        setStep("preparing");
      } else if (!payWithAbonement) {
        await payFromBalance({
          amount: selected.price,
          tariff_title: selected.title,
          description,
        });
        await refreshBalance();
        setStep("preparing");
      } else {
        throw new Error(t("payment.failed", "Не удалось оплатить"));
      }
    } catch (err) {
      setPayError(
        paymentErrorMessage(err, t("payment.failed", "Не удалось оплатить")),
      );
      setStep("error");
    }
  };

  const title = t("payment.title", "Оплата");

  return (
    <PageLayout title={title} className="page--profile-edit">
      <div
        className={`profile-edit cw-payment${
          step === "preparing" || step === "washing" || step === "success"
            ? " details-charging"
            : ""
        }`}
      >
        <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
          <BackButton
            onClick={handleBack}
            disabled={step === "processing"}
          >
            {t("common.back", "Назад")}
          </BackButton>
        </div>

        {step === "preparing" && washSessionId != null ? (
          <div className="details-charging__stage is-charging">
            <WashPrepareTimer
              sessionId={washSessionId}
              initialStatus={washSessionStatus}
              initialWasherId={washWasherId}
              onReady={(info) => {
                if (info?.status) setWashSessionStatus(info.status);
                if (info?.washerId != null) setWashWasherId(info.washerId);
                startWash();
              }}
              onFinished={finishWash}
            />
          </div>
        ) : null}

        {step === "washing" && washSessionId != null ? (
          <div className="details-charging__stage is-charging">
            <WashSessionView
              sessionId={washSessionId}
              stationTitle={station.paymentTitle}
              tariffTitle={selected?.title ?? t("payment.tariff", "Тариф")}
              price={selected?.price ?? 0}
              washerId={washWasherId}
              onDone={finishWash}
            />
          </div>
        ) : null}

        {step === "processing" ? (
          <div className="profile-edit__main ev-pay-status ev-pay-status--center" role="status">
            <span className="profile-boot__spinner ev-pay-status__spinner" aria-hidden />
            <h1 className="ev-pay-status__title">
              {t("payment.processing", "Оплата...")}
            </h1>
            <p className="ev-pay-status__text">
              {t("payment.deducting", "Списываем с баланса")}
            </p>
          </div>
        ) : null}

        {step === "success" ? (
          <div className="details-charging__stage is-status">
            <div className="ev-checkout ev-checkout--status ev-pay-status ev-pay-status--center">
              <div className="ev-pay-status__badge is-ok" aria-hidden>
                <IconOk />
              </div>
              <h1 className="ev-pay-status__title">
                {t("wash.done_title", "Мойка завершена")}
              </h1>
              <p className="ev-pay-status__text">
                {t("payment.success", "Оплата прошла успешно")}
                {selected
                  ? `. ${selected.price} ₸ · ${selected.title}`
                  : ""}
              </p>
              <div className="ev-pay-status__footer">
                <button type="button" className="theme-button w-full" onClick={goMap}>
                  {t("common.done", "Готово")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "error" ? (
          <div className="profile-edit__main ev-pay-status ev-pay-status--center">
            <div className="ev-pay-status__badge is-fail" aria-hidden>
              <IconFail />
            </div>
            <h1 className="ev-pay-status__title">
              {t("ev.pay_error_title", "Ошибка оплаты")}
            </h1>
            <p className="ev-pay-status__text">
              {payError ||
                t(
                  "ev.pay_error_text",
                  "Процесс оплаты был прерван по техническим причинам.",
                )}
            </p>
            <div className="ev-pay-status__footer">
              <div className="ev-pay-status__actions">
                <button
                  type="button"
                  className="theme-button w-full"
                  onClick={() => void handlePay()}
                >
                  {t("common.retry", "Повторить")}
                </button>
                <button
                  type="button"
                  className="theme-button-secondary w-full"
                  onClick={() => {
                    setStep("form");
                    setPayError(null);
                  }}
                >
                  {t("ev.to_home_short", "Назад")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "form" ? (
          <div
            className={`profile-edit__main ev-pay cw-pay profile-home${
              locked ? " pointer-events-none opacity-60" : ""
            }`}
          >
            <section className="profile-card">
              <div className="profile-card__balance">
                <div className="profile-card__balance-item">
                  <p className="profile-card__balance-label">
                    {station.kind === "charging"
                      ? t("ev.order_station", "Станция")
                      : t("common.wash", "Мойка")}
                  </p>
                  <p className="profile-card__balance-value">{station.paymentTitle}</p>
                </div>
                <div className="profile-card__balance-item">
                  <p className="profile-card__balance-label">
                    {t("home.balance", "Баланс")}
                  </p>
                  <p className="profile-card__balance-value">
                    {balanceLoading && balance == null
                      ? "…"
                      : formatBalance(balanceValue)}
                  </p>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card__balance">
                <p className="cw-pay__title">{t("payment.pay_method", "Способ оплаты")}</p>
                <div
                  className="cw-pay__tariffs"
                  role="radiogroup"
                  aria-label={t("payment.pay_method", "Способ оплаты")}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paySource === "balance"}
                    className={`cw-pay__tariff${paySource === "balance" ? " is-on" : ""}`}
                    disabled={locked}
                    onClick={() => setPaySource("balance")}
                  >
                    <RadioMark checked={paySource === "balance"} />
                    <span className="cw-pay__tariff-body">
                      <span className="cw-pay__tariff-title">
                        {t("home.balance", "Баланс")}
                      </span>
                      <span className="cw-pay__tariff-desc">
                        {balanceLoading && balance == null
                          ? "…"
                          : formatBalance(balanceValue)}
                      </span>
                    </span>
                  </button>
                  {abonCards.map((card) => {
                    const checked = paySource === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        className={`cw-pay__tariff${checked ? " is-on" : ""}`}
                        disabled={locked}
                        onClick={() => setPaySource(card.id)}
                      >
                        <RadioMark checked={checked} />
                        <span className="cw-pay__tariff-body">
                          <span className="cw-pay__tariff-title">{card.title}</span>
                          <span className="cw-pay__tariff-desc">
                            {t("profile.abonement_subtitle_wash", "{n} моек").replace(
                              "{n}",
                              String(card.remainingWashes ?? 0),
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card__balance">
                <p className="cw-pay__title">{t("payment.tariffs", "Тарифы")}</p>
                <div
                  className="cw-pay__tariffs"
                  role="radiogroup"
                  aria-label={t("payment.tariffs", "Тарифы")}
                >
                  {tariffs.map((tariff) => {
                    const key = tariff.id != null ? String(tariff.id) : tariff.title;
                    const isSelected = selectedTariffKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`cw-pay__tariff${isSelected ? " is-on" : ""}`}
                        disabled={locked}
                        onClick={() => setSelectedTariffKey(key)}
                      >
                        <RadioMark checked={isSelected} />
                        <span className="cw-pay__tariff-body">
                          <span className="cw-pay__tariff-title">{tariff.title}</span>
                          {tariff.description ? (
                            <span className="cw-pay__tariff-desc">{tariff.description}</span>
                          ) : null}
                          {tariff.items && tariff.items.length > 0 ? (
                            <ul className="cw-pay__tariff-items">
                              {tariff.items.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </span>
                        <span className="cw-pay__tariff-price">{tariff.price} ₸</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {selected ? (
              <div className="ev-pay__actions">
                <button
                  type="button"
                  className="theme-button w-full"
                  disabled={!canAfford || locked || balanceLoading}
                  onClick={() => void handlePay()}
                >
                  {station.kind === "charging"
                    ? t("payment.pay_charge", "Оплатить зарядку")
                    : t("payment.pay_wash", "Оплатить мойку")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
