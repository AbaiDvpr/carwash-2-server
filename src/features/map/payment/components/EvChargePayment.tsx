"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import { formatBalance, useUserBalance } from "@/features/profile/hooks/useUserBalance";
import {
  evAbonements,
  fetchAbonementCards,
  formatKwh,
  type AbonementCard,
} from "@/features/profile/abonements";
import { ApiError } from "@/lib/api";
import { payEv } from "@/lib/api/payments";
import {
  detailsChargingPath,
} from "@/features/map/home/mapLiveSession";
import {
  fetchEvSession,
  type EvSession,
} from "@/lib/api/evSessions";
import { formatPowerKw, formatPricePerKwh } from "@/features/map/evConnectors";
import { localizeStandTitle } from "@/lib/standTitle";
import "@/features/profile/components/profile.css";
import "../ev-charge-payment.css";
import "../car-wash-payment.css";

/** Оценка кВт·ч к списанию с абонемента (как AbonementBilling::estimateEvKwh). */
function estimatePayKwh(session: EvSession, amount: number): number {
  const meta = session.meta ?? {};
  const charged = Number(meta.charged_kwh);
  if (Number.isFinite(charged) && charged > 0) {
    return Math.max(0.01, Math.round(charged * 100) / 100);
  }
  let rate = Number(session.price_per_kwh ?? meta.price_per_kwh);
  if (!Number.isFinite(rate) || rate <= 0) rate = 95;
  if (amount > 0) {
    return Math.max(0.01, Math.round((amount / rate) * 100) / 100);
  }
  return 1;
}

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
  const [paySource, setPaySource] = useState<"balance" | string>("balance");
  const [useBalanceForDiff, setUseBalanceForDiff] = useState(false);
  const [abonCards, setAbonCards] = useState<AbonementCard[]>([]);
  const payTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cards = await fetchAbonementCards();
        if (!cancelled) setAbonCards(evAbonements(cards));
      } catch {
        if (!cancelled) setAbonCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const kwhNeeded = useMemo(() => {
    if (!session || amount <= 0) return 0;
    return estimatePayKwh(session, amount);
  }, [session, amount]);
  const kwhLabel = kwhNeeded > 0 ? formatKwh(kwhNeeded, t) : "—";

  const selectedAbon = useMemo(() => {
    if (paySource === "balance") return null;
    return abonCards.find((card) => card.id === paySource) ?? null;
  }, [abonCards, paySource]);

  const abonSplit = useMemo(() => {
    if (!selectedAbon || kwhNeeded <= 0) {
      return {
        abonKwh: 0,
        balanceKwh: 0,
        balanceAmount: 0,
        coversFull: false,
        hasShortfall: false,
      };
    }
    const remaining = Math.max(0, Number(selectedAbon.remainingKwh ?? 0));
    const abonKwh = Math.min(remaining, kwhNeeded);
    const balanceKwh = Math.round(Math.max(0, kwhNeeded - abonKwh) * 100) / 100;
    const coversFull = balanceKwh <= 0.0001;
    const hasShortfall = !coversFull;
    const balanceAmount = coversFull
      ? 0
      : Math.max(
          0.01,
          Math.round(amount * (balanceKwh / kwhNeeded) * 100) / 100,
        );
    return { abonKwh, balanceKwh, balanceAmount, coversFull, hasShortfall };
  }, [selectedAbon, kwhNeeded, amount]);

  const standTitle = localizeStandTitle(
    session?.stand_title ?? session?.charger_type ?? session?.meta?.stand_title,
    t,
    session?.meta?.stand_index ?? null,
  );
  const portLabel =
    session?.port_label ?? session?.pistol_type ?? session?.meta?.port_label ?? "—";
  const address = session?.address ?? session?.meta?.address ?? "—";
  const limitLabel = session?.limit_label ?? "—";
  const priceHint =
    session?.price_per_kwh != null
      ? formatPricePerKwh(Number(session.price_per_kwh), t)
      : "—";
  const powerHint =
    session?.charger_power != null
      ? formatPowerKw(Number(session.charger_power), t)
      : "—";

  function selectPaySource(source: "balance" | string) {
    setPaySource(source);
    setUseBalanceForDiff(false);
  }

  async function onPay() {
    if (paying || !session || session.payment_id) return;
    const payWithAbonement = paySource !== "balance";
    const balanceValue = balance ?? 0;
    if (!payWithAbonement) {
      if (balanceLoading || balanceValue < amount) return;
    } else if (abonSplit.abonKwh <= 0) {
      return;
    } else if (abonSplit.hasShortfall) {
      if (!useBalanceForDiff) return;
      if (balanceLoading || balanceValue < abonSplit.balanceAmount) return;
    }
    setPaying(true);
    setPayResult(null);
    setPayError(null);

    try {
      const abonementId =
        paySource !== "balance" ? Number.parseInt(paySource, 10) : undefined;
      await payEv({
        session_id: session.id,
        description: `${address} · ${portLabel}/${standTitle} · ${limitLabel}`,
        ...(abonementId != null && Number.isFinite(abonementId)
          ? {
              abonement_id: abonementId,
              use_balance: abonSplit.hasShortfall && useBalanceForDiff,
            }
          : {}),
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
        body?.errors?.abonement_id?.[0] ??
        body?.errors?.use_balance?.[0] ??
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
  const payWithAbonement = paySource !== "balance";
  const showBalanceToggle = payWithAbonement && abonSplit.hasShortfall;
  const effectiveUseBalance = showBalanceToggle && useBalanceForDiff;

  const canAffordBalance =
    Number.isFinite(balanceValue) && balanceValue >= amount;
  const needsBalanceTopUp =
    effectiveUseBalance &&
    (!Number.isFinite(balanceValue) || balanceValue < abonSplit.balanceAmount);
  const canAffordAbonement =
    payWithAbonement &&
    abonSplit.abonKwh > 0 &&
    (abonSplit.coversFull ||
      (effectiveUseBalance &&
        Number.isFinite(balanceValue) &&
        balanceValue >= abonSplit.balanceAmount));
  const canPay =
    !session.payment_id &&
    !balanceLoading &&
    (payWithAbonement ? canAffordAbonement : canAffordBalance);

  const abonHint = (() => {
    if (!payWithAbonement) return null;
    if (abonSplit.coversFull) {
      return t(
        "payment.abon_full_cover",
        "Заказ будет полностью оплачен абонементом",
      );
    }
    if (!useBalanceForDiff) {
      return t(
        "payment.abon_enable_diff",
        "Включите доплату с баланса, чтобы оплатить заказ",
      );
    }
    if (needsBalanceTopUp) {
      return t("payment.abon_need_topup", "Нужно пополнить баланс.");
    }
    return t(
      "payment.abon_cover_from_balance_on",
      "Недостающая часть будет списана с баланса",
    );
  })();

  const balanceDueLabel = abonSplit.balanceAmount.toLocaleString("ru-RU");
  const abonKwhLabel =
    abonSplit.abonKwh > 0 ? formatKwh(abonSplit.abonKwh, t) : "—";

  const payButtonLabel = (() => {
    if (paying) return t("common.loading", "Загрузка…");
    if (!payWithAbonement) {
      return `${t("ev.pay", "Оплатить")} · ${amountLabel} ₸`;
    }
    if (abonSplit.coversFull) {
      return `${t("ev.pay_abonement", "Оплатить абонементом")} · ${kwhLabel}`;
    }
    if (effectiveUseBalance) {
      return `${t("ev.pay", "Оплатить")} · ${abonKwhLabel} + ${balanceDueLabel} ₸`;
    }
    return t("ev.pay_abonement", "Оплатить абонементом");
  })();

  return (
    <PageLayout title={t("payment.title", "Оплата")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
          <PayBack />
        </div>

        <div className="profile-edit__main ev-pay cw-pay profile-home">
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
                  disabled={paying}
                  onClick={() => selectPaySource("balance")}
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
                      disabled={paying}
                      onClick={() => selectPaySource(card.id)}
                    >
                      <RadioMark checked={checked} />
                      <span className="cw-pay__tariff-body">
                        <span className="cw-pay__tariff-title">{card.title}</span>
                        <span className="cw-pay__tariff-desc">
                          {formatKwh(card.remainingKwh ?? 0, t)}
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
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.charged", "Заряжено")}
                </p>
                <p className="profile-card__balance-value">{kwhLabel}</p>
              </div>

              {payWithAbonement ? (
                <div className="profile-card__balance-item">
                  <p className="profile-card__balance-label">
                    {t("profile.abonement", "Абонемент")}
                  </p>
                  <p className="profile-card__balance-value">{abonKwhLabel}</p>
                </div>
              ) : null}

              {showBalanceToggle ? (
                <label className="ev-pay__balance-toggle">
                  <span className="ev-pay__balance-toggle-label">
                    <span className="ev-pay__balance-toggle-title">
                      {t(
                        "payment.abon_cover_from_balance",
                        "Доплатить с баланса",
                      )}
                    </span>
                    <span className="ev-pay__balance-toggle-desc">
                      {t(
                        "payment.abon_cover_from_balance_hint",
                        "Списать недостающие {n} ₸ с баланса",
                      ).replace("{n}", balanceDueLabel)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={useBalanceForDiff}
                    disabled={paying}
                    onChange={(e) => setUseBalanceForDiff(e.target.checked)}
                    aria-label={t(
                      "payment.abon_cover_from_balance",
                      "Доплатить с баланса",
                    )}
                  />
                  <span
                    className={`ev-pay__toggle-switch${
                      useBalanceForDiff ? " is-on" : ""
                    }`}
                    aria-hidden
                  />
                </label>
              ) : null}

              {payWithAbonement && effectiveUseBalance ? (
                <div className="profile-card__balance-item">
                  <p className="profile-card__balance-label">
                    {t("ev.from_balance", "С баланса")}
                  </p>
                  <p className="profile-card__balance-value">
                    {balanceDueLabel} ₸
                  </p>
                </div>
              ) : null}

              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("ev.to_pay", "К оплате")}
                </p>
                <p className="profile-card__balance-value ev-pay__total-value">
                  {payWithAbonement
                    ? abonSplit.coversFull
                      ? kwhLabel
                      : effectiveUseBalance
                        ? `${abonKwhLabel} + ${balanceDueLabel} ₸`
                        : abonKwhLabel
                    : `${amountLabel} ₸`}
                </p>
              </div>
              {abonHint ? (
                <p
                  className={`cw-pay__hint${needsBalanceTopUp ? " is-danger" : ""}`}
                  role="status"
                >
                  {abonHint}
                </p>
              ) : null}
            </div>
          </section>

          <div className="ev-pay__actions">
            <button
              type="button"
              className="theme-button w-full"
              disabled={paying || !canPay}
              onClick={() => void onPay()}
            >
              {payButtonLabel}
            </button>
            {needsBalanceTopUp ? (
              <button
                type="button"
                className="theme-button-secondary w-full"
                onClick={() => router.push("/profile/top-up")}
              >
                {t("profile.top_up", "Пополнить баланс")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
