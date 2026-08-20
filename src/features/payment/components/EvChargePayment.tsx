"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import { formatBalance, useUserBalance } from "@/features/profile/hooks/useUserBalance";
import { ApiError } from "@/lib/api";
import { payEv } from "@/lib/api/payments";
import {
  detailsChargingPath,
} from "@/features/home/mapLiveSession";
import {
  fetchEvSession,
  type EvSession,
} from "@/lib/api/evSessions";
import "@/features/profile/components/profile.css";
import "../ev-charge-payment.css";

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

export default function EvChargePayment() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const sessionId = sessionParam ? Number(sessionParam) : NaN;

  const { balance, loading: balanceLoading } = useUserBalance();
  const [session, setSession] = useState<EvSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFoundSession, setNotFoundSession] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState<"success" | "error" | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const payTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isFinite(sessionId) || sessionId <= 0) {
        setNotFoundSession(true);
        setLoadError(null);
        setSession(null);
        setReady(true);
        return;
      }
      try {
        const data = await fetchEvSession(sessionId);
        if (cancelled) return;
        setNotFoundSession(false);
        if (data.payment_id) {
          setLoadError(t("ev.already_paid", "Сессия уже оплачена"));
          setSession(data);
        } else {
          setSession(data);
          setLoadError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const apiErr = err instanceof ApiError ? err : null;
        const body = apiErr
          ? (apiErr.body as { message?: string; code?: string } | null)
          : null;
        const missing =
          apiErr?.status === 404 ||
          body?.code === "session_not_found" ||
          body?.code === "not_found";
        setSession(null);
        if (missing) {
          setNotFoundSession(true);
          setLoadError(null);
        } else {
          setNotFoundSession(false);
          setLoadError(
            body?.message ??
              t("ev.pay_draft_missing_title", "Сессия оплаты не найдена"),
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (payTimerRef.current != null) {
        window.clearTimeout(payTimerRef.current);
      }
    };
  }, [sessionId, t]);

  function goHome() {
    router.push("/");
  }

  function goBack() {
    if (Number.isFinite(sessionId) && sessionId > 0 && payResult !== "success") {
      router.push(detailsChargingPath(sessionId));
      return;
    }
    goHome();
  }

  function PayBack({ disabled = false }: { disabled?: boolean }) {
    return (
      <BackButton onClick={goBack} disabled={disabled}>
        {t("common.back", "Назад")}
      </BackButton>
    );
  }

  const amount = useMemo(() => {
    if (!session) return 0;
    return Number(session.amount ?? session.payment_amount ?? 0);
  }, [session]);

  const amountLabel = amount.toLocaleString("ru-RU");
  const standTitle =
    session?.stand_title ?? session?.charger_type ?? session?.meta?.stand_title ?? "—";
  const portLabel =
    session?.port_label ?? session?.pistol_type ?? session?.meta?.port_label ?? "—";
  const address = session?.address ?? session?.meta?.address ?? "—";
  const limitLabel = session?.limit_label ?? "—";
  const priceHint =
    session?.price_per_kwh != null
      ? `${Number(session.price_per_kwh)} ₸/кВт·ч`
      : "—";
  const powerHint =
    session?.charger_power != null ? `${session.charger_power} кВт` : "—";

  async function onPay() {
    if (paying || !session || session.payment_id) return;
    setPaying(true);
    setPayResult(null);
    setPayError(null);

    try {
      await payEv({
        session_id: session.id,
        description: `${address} · ${portLabel}/${standTitle} · ${limitLabel}`,
      });
      setPayResult("success");
    } catch (err) {
      const body =
        err instanceof ApiError
          ? (err.body as { message?: string; errors?: Record<string, string[]> })
          : null;
      const message =
        body?.errors?.amount?.[0] ??
        body?.errors?.session_id?.[0] ??
        body?.message ??
        t("ev.pay_failed", "Не удалось оплатить");
      setPayError(message);
      setPayResult("error");
    } finally {
      setPaying(false);
    }
  }

  if (!ready) {
    return (
      <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <PayBack />
          </div>
          <div className="ev-pay-skeleton">
            <div className="ev-pay-skeleton__line" />
            <div className="ev-pay-skeleton__block" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!session || loadError || notFoundSession) {
    return (
      <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <PayBack />
          </div>
          <div className="profile-edit__main ev-pay-status ev-pay-status--center">
            <span className="ev-pay-status__empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m16.2 16.2 4.3 4.3" />
                <path strokeLinecap="round" d="M8.8 11h4.4" />
              </svg>
            </span>
            <h1 className="ev-pay-status__title">
              {notFoundSession
                ? t("common.nothing_found", "Ничего не нашли")
                : loadError ?? t("common.nothing_found", "Ничего не нашли")}
            </h1>
            <p className="ev-pay-status__text">
              {notFoundSession || !session
                ? t(
                    "ev.session_not_found_text",
                    "Сессия зарядки не найдена или больше недоступна.",
                  )
                : t(
                    "ev.pay_draft_missing_text",
                    "Вернись на карту и пройди зарядку заново.",
                  )}
            </p>
            <div className="ev-pay-status__footer">
              <button type="button" className="theme-button w-full" onClick={goHome}>
                {t("common.to_home", "На главную")}
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (paying) {
    return (
      <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <PayBack disabled />
          </div>
          <div className="profile-edit__main ev-pay-status ev-pay-status--center" role="status">
            <span className="profile-boot__spinner ev-pay-status__spinner" aria-hidden />
            <h1 className="ev-pay-status__title">
              {t("payment.processing", "Оплата...")}
            </h1>
            <p className="ev-pay-status__text">
              {t("payment.deducting", "Списываем с баланса")}
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (payResult != null) {
    const ok = payResult === "success";
    return (
      <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <PayBack />
          </div>
          <div className="profile-edit__main ev-pay-status ev-pay-status--center">
            <div
              className={`ev-pay-status__badge${ok ? " is-ok" : " is-fail"}`}
              aria-hidden
            >
              {ok ? <IconOk /> : <IconFail />}
            </div>
            <h1 className="ev-pay-status__title">
              {ok
                ? t("ev.pay_success_title", "Успешно")
                : t("ev.pay_error_title", "Ошибка оплаты")}
            </h1>
            <p className="ev-pay-status__text">
              {ok
                ? t(
                    "ev.pay_success_text",
                    "Оплата прошла успешно. Спасибо! Не забудь пополнить баланс на следующий раз.",
                  )
                : payError ||
                  t(
                    "ev.pay_error_text",
                    "Процесс оплаты был прерван по техническим причинам.",
                  )}
            </p>
            <div className="ev-pay-status__footer">
              {ok ? (
                <button type="button" className="theme-button w-full" onClick={goHome}>
                  {t("common.done", "Готово")}
                </button>
              ) : (
                <div className="ev-pay-status__actions">
                  <button
                    type="button"
                    className="theme-button w-full"
                    onClick={() => setPayResult(null)}
                  >
                    {t("common.retry", "Повторить")}
                  </button>
                  <button
                    type="button"
                    className="theme-button-secondary w-full"
                    onClick={goHome}
                  >
                    {t("ev.to_home_short", "Назад")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const balanceValue = balance ?? 0;
  const canPay = balanceValue >= amount && !session.payment_id;

  return (
    <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
          <PayBack />
        </div>

        <div className="profile-edit__main ev-pay profile-home">
          <section className="profile-card">
            <div className="profile-card__balance ev-pay__order">
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.order_address", "Адрес")}
                </p>
                <p className="profile-card__balance-value">{address}</p>
              </div>
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.order_station", "Станция")}
                </p>
                <p className="profile-card__balance-value">{standTitle}</p>
              </div>
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.order_port", "Разъём")}
                </p>
                <p className="profile-card__balance-value">
                  {portLabel} · {limitLabel}
                </p>
              </div>
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.order_tariff", "Тариф")}
                </p>
                <p className="profile-card__balance-value">
                  {priceHint} · {powerHint}
                </p>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card__balance">
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
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.from_balance", "С баланса")}
                </p>
                <p className="profile-card__balance-value">{amountLabel} ₸</p>
              </div>
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.charge_cost", "Зарядка")}
                </p>
                <p className="profile-card__balance-value">{amountLabel} ₸</p>
              </div>
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.total", "Итого")}
                </p>
                <p className="profile-card__balance-value ev-pay__total-value">
                  {amountLabel} ₸
                </p>
              </div>
            </div>
          </section>

          <div className="ev-pay__actions">
            <button
              type="button"
              className="theme-button w-full"
              disabled={paying || !canPay}
              onClick={() => void onPay()}
            >
              {paying
                ? t("common.loading", "Загрузка…")
                : `${t("ev.pay", "Оплатить")} · ${amountLabel} ₸`}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
