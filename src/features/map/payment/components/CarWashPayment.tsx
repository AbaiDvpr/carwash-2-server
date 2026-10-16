"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { apiFailMessage, safeApiError } from "@/lib/apiFail";
import { parseEvStationId } from "@/lib/api/ev";
import { fetchUserInfo } from "@/lib/api/auth";
import { payCarWash, payEv, payFromBalance } from "@/lib/api/payments";
import { fetchCwSession, washLeftWithoutWash } from "@/lib/api/sessions";
import { useT, useLocale } from "@/hooks/useT";
import {
  localizeWashTariff,
  fetchCwCanPay,
  type CwCanPayCar,
  type CwPaymentAccount,
} from "@/lib/api/cw";
import { washSessionPath } from "@/features/map/home/mapLiveSession";
import {
  partnerBalanceLabel,
  payPhrase,
  washPayCheckMessage,
  washPayCheckTitle,
  washPayCheckCodeFromApi,
} from "@/lib/washPayCheckI18n";
import type { AppLocale } from "@/lib/i18n/storage";
import { formatBalance, useUserBalance } from "@/features/profile/hooks/useUserBalance";
import {
  fetchAbonementCards,
  washAbonements,
  type AbonementCard,
} from "@/features/profile/abonements";
import WashPrepareTimer from "@/features/map/wash/WashPrepareTimer";
import WashSessionView from "@/features/map/wash/WashSessionView";
import {
  armWashDoneSound,
  startWashDoneSound,
  stopWashDoneSound,
} from "@/features/map/wash/washSounds";
import { formatCarPlate } from "@/features/map/wash/formatCarPlate";
import "@/features/profile/components/profile.css";
import "@/features/map/charging/charging-session-variants.css";
import "@/features/map/charging/details-charging.css";
import "@/features/map/wash/wash-session.css";
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

function limitFraction(left: number, limit: number): string {
  const amount = (value: number) =>
    Math.round(value).toLocaleString("ru-RU");
  return `${amount(left)}/${amount(limit)} ₸`;
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

function paymentErrorMessage(
  err: unknown,
  t: (key: string, fallback?: string) => string,
  locale: AppLocale,
  fallback: string,
): string {
  if (err instanceof ApiError) {
    const body = err.body as {
      message?: string;
      code?: string;
      errors?: Record<string, string[]>;
    } | null;
    const code = washPayCheckCodeFromApi(body);
    if (code) {
      return washPayCheckMessage(t, code, locale);
    }
    const fieldError =
      body?.errors?.amount?.[0] ??
      body?.errors?.tariff_id?.[0] ??
      body?.errors?.location_id?.[0] ??
      body?.errors?.abonement_id?.[0];
    if (fieldError) return fieldError;
    return safeApiError(err, t);
  }
  return apiFailMessage(t);
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
  const carIdParam = searchParams.get("car_id");
  const payFromParam = searchParams.get("pay_from");
  const partnerIdParam = searchParams.get("partner_id");
  const partnerIdFromQuery = (() => {
    if (!partnerIdParam) return null;
    const n = Number.parseInt(partnerIdParam, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const carIdFromQuery = (() => {
    if (!carIdParam) return null;
    const n = Number.parseInt(carIdParam, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(
    () => tariff,
  );
  const [paySource, setPaySource] = useState<"balance" | string>("balance");
  const [payFrom, setPayFrom] = useState<"self" | "partner">(() =>
    payFromParam === "partner" ? "partner" : "self",
  );
  const [partnerId, setPartnerId] = useState<number | null>(partnerIdFromQuery);
  const [paymentAccounts, setPaymentAccounts] = useState<CwPaymentAccount[]>([]);
  const [spendMonth, setSpendMonth] = useState<number | null>(null);
  const [spendLeft, setSpendLeft] = useState<number | null>(null);
  const [spendUsed, setSpendUsed] = useState<number | null>(null);
  const [payCars, setPayCars] = useState<CwCanPayCar[]>([]);
  const [spendReady, setSpendReady] = useState(false);
  const [balanceDrawerOpen, setBalanceDrawerOpen] = useState(false);
  const [balancePicked, setBalancePicked] = useState(false);
  const [abonCards, setAbonCards] = useState<AbonementCard[]>([]);
  const [step, setStep] = useState<PayStep>(() =>
    resumeSessionParam ? "processing" : "form",
  );
  const washBusy =
    step === "processing" ||
    step === "preparing" ||
    step === "washing" ||
    step === "success";
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useUserBalance({
    syncOnFocus: !washBusy,
  });
  const [payError, setPayError] = useState<string | null>(null);
  /** Код ошибки оплаты мойки — текст всегда через t()/locale при рендере */
  const [payErrorCode, setPayErrorCode] = useState<string | null>(null);
  const [presenceCode, setPresenceCode] = useState<string | null>(null);
  const [payCarId, setPayCarId] = useState<number | null>(carIdFromQuery);
  const [payCarPlate, setPayCarPlate] = useState<string | null>(null);
  const [washSessionId, setWashSessionId] = useState<number | null>(null);
  const [washSessionStatus, setWashSessionStatus] = useState<string>("pending");
  const [washWasherId, setWashWasherId] = useState<number | null>(null);
  const [washBayNumber, setWashBayNumber] = useState<number | null>(null);
  const [washStartAt, setWashStartAt] = useState<string | null>(null);
  const [washTariffTitle, setWashTariffTitle] = useState<string | null>(null);
  const [washPrice, setWashPrice] = useState<number | null>(null);
  const [washLeftBuilding, setWashLeftBuilding] = useState(false);
  const [canRetryPay, setCanRetryPay] = useState(true);
  const [resumeReady, setResumeReady] = useState(() => !resumeSessionParam);
  const resumeRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cards, user] = await Promise.all([
          fetchAbonementCards(),
          fetchUserInfo().catch(() => null),
        ]);
        if (cancelled) return;
        setAbonCards(washAbonements(cards));
        const partners =
          user?.partners && user.partners.length > 0
            ? user.partners
            : user?.partner
              ? [user.partner]
              : [];
        if (partners.length > 0) {
          setPaymentAccounts((prev) => {
            if (prev.some((a) => a.id === "partner")) return prev;
            return [
              {
                id: "self",
                label: payPhrase(t, "pay_self", locale),
                balance: Number(user?.balance) || 0,
              },
              ...partners.map((partner) => ({
                id: "partner" as const,
                label: partnerBalanceLabel(t, locale, partner.name),
                balance: Number(partner.balance) || 0,
                partner_user_id: partner.id,
                phone: partner.phone,
                name: partner.name ?? null,
              })),
            ];
          });
          setPartnerId((current) => {
            if (current != null && partners.some((partner) => partner.id === current)) {
              return current;
            }
            return partners.length === 1 ? partners[0]!.id : current;
          });
        }
      } catch {
        if (!cancelled) setAbonCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, locale]);

  // До оплаты: на площадке ли машина / нет ли уже активной мойки.
  useEffect(() => {
    if (resumeSessionParam) return;
    const cwId = /^\d+$/.test(station.id) ? Number.parseInt(station.id, 10) : null;
    if (cwId == null || !Number.isFinite(cwId)) return;

    let cancelled = false;
    void (async () => {
      try {
        const check = await fetchCwCanPay(
          cwId,
          carIdFromQuery ?? undefined,
          partnerIdFromQuery ?? undefined,
        );
        if (cancelled) return;
        if (check.car_id != null) setPayCarId(check.car_id);
        if (check.car_plate) setPayCarPlate(check.car_plate);
        if (Array.isArray(check.payment_accounts) && check.payment_accounts.length > 0) {
          setPaymentAccounts(check.payment_accounts);
        }
        setSpendMonth(
          check.spend_month != null && Number.isFinite(Number(check.spend_month))
            ? Number(check.spend_month)
            : null,
        );
        setSpendLeft(
          check.spend_month_left != null &&
            Number.isFinite(Number(check.spend_month_left))
            ? Number(check.spend_month_left)
            : null,
        );
        setSpendUsed(
          check.spend_month_used != null &&
            Number.isFinite(Number(check.spend_month_used))
            ? Number(check.spend_month_used)
            : null,
        );
        setPayCars(Array.isArray(check.cars) ? check.cars : []);
        setSpendReady(true);
        if (
          check.code === "active_wash" &&
          check.session_id != null &&
          check.location_id != null
        ) {
          router.replace(washSessionPath(check.location_id, check.session_id));
          return;
        }
        if (!check.ok) {
          setPresenceCode(check.code ?? "not_on_territory");
        } else {
          setPresenceCode(null);
        }
      } catch {
        if (!cancelled) {
          setPresenceCode(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [station.id, resumeSessionParam, router, carIdFromQuery, partnerIdFromQuery]);

  // Возврат к активной мойке (?session=id) — очередь / приглашение / мойка.
  useEffect(() => {
    const raw = resumeSessionParam;
    if (!raw) {
      setResumeReady(true);
      return;
    }

    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setResumeReady(true);
      setStep("form");
      return;
    }

    const requestId = ++resumeRequestRef.current;
    let cancelled = false;
    setResumeReady(false);
    setStep("processing");
    setPayError(null);
    setPayErrorCode(null);

    void (async () => {
      try {
        const { session } = await fetchCwSession(id);
        if (cancelled || requestId !== resumeRequestRef.current) return;

        const status = (session.status ?? "pending").toLowerCase();
        setWashSessionId(session.id);
        setWashSessionStatus(status);
        setWashWasherId(session.washer_id ?? null);
        setWashBayNumber(session.bay_number ?? null);
        setWashStartAt(session.start_at ?? null);
        if (session.tariff_title) {
          setWashTariffTitle(session.tariff_title);
        }
        if (session.car_plate) {
          setPayCarPlate(session.car_plate);
        }
        const resumePrice = Number(
          session.payment_display_amount ?? session.payment_amount,
        );
        if (Number.isFinite(resumePrice) && resumePrice >= 0) {
          setWashPrice(resumePrice);
        }

        const walkedAway = washLeftWithoutWash(session);
        setWashLeftBuilding(walkedAway);

        if (walkedAway || status === "completed") {
          setStep("success");
        } else if (status === "cancelled" || status === "error") {
          setCanRetryPay(false);
          setPayError(
            status === "error"
              ? t("wash.session_failed", "Сессия мойки завершилась с ошибкой")
              : t("wash.session_cancelled", "Мойка отменена"),
          );
          setStep("error");
        } else if (status === "in_progress") {
          setStep("washing");
        } else {
          // pending / invited / queue — экран очереди или приглашения
          setStep("preparing");
        }
      } catch {
        if (cancelled || requestId !== resumeRequestRef.current) return;
        setPayError(
          t("wash.resume_failed", "Не удалось открыть активную мойку"),
        );
        setCanRetryPay(false);
        setStep("error");
      } finally {
        if (!cancelled && requestId === resumeRequestRef.current) {
          setResumeReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeSessionParam, t]);

  const tariffs = station.tariff.map((tariffRow) => localizeWashTariff(tariffRow, locale));
  const hasPartnerPay = paymentAccounts.some((a) => a.id === "partner");
  const effectivePayFrom =
    paySource === "balance" && hasPartnerPay ? payFrom : "self";
  const partnerAccount =
    paymentAccounts.find(
      (account) =>
        account.id === "partner" &&
        (partnerId == null || account.partner_user_id === partnerId),
    ) ?? paymentAccounts.find((account) => account.id === "partner");
  const selfAccount = paymentAccounts.find((a) => a.id === "self");
  const payingFromPartner = effectivePayFrom === "partner";
  const spendSnapshot = useMemo(() => {
    const car =
      payCars.find((row) => row.id === (payCarId ?? carIdFromQuery)) ??
      payCars.find((row) => row.car_plate === payCarPlate) ??
      null;
    const partners = car?.partners ?? [];
    const wantedId = partnerId ?? partnerIdFromQuery;
    const partner =
      partners.find((row) => row.id === wantedId) ??
      (partners.length === 1 ? partners[0] : null) ??
      null;
    const source = partner
      ? {
          limit: partner.spend_month,
          left: partner.spend_month_left,
          used: partner.spend_month_used,
        }
      : partners.length > 0
        ? null
        : { limit: spendMonth, left: spendLeft, used: spendUsed };
    if (!source || source.limit == null || source.left == null) return null;
    const limit = Number(source.limit);
    const left = Number(source.left);
    if (!Number.isFinite(limit) || !Number.isFinite(left)) return null;
    const used = source.used == null ? Math.max(0, limit - left) : Number(source.used);
    return {
      limit,
      left,
      used: Number.isFinite(used) ? used : Math.max(0, limit - left),
    };
  }, [
    payCars,
    payCarId,
    carIdFromQuery,
    payCarPlate,
    partnerId,
    partnerIdFromQuery,
    spendMonth,
    spendLeft,
    spendUsed,
  ]);

  /** Месячный лимит компании только при оплате с её баланса. */
  const applySpend = payingFromPartner;

  const tariffWithinSpend = (price: number) => {
    if (!applySpend || !spendReady) return true;
    if (!spendSnapshot) return false;
    return price - 0.0001 <= spendSnapshot.left;
  };

  const selected = tariffs.find((tariffRow) => {
    const key = tariffRow.id != null ? String(tariffRow.id) : tariffRow.title;
    return key === selectedTariffKey;
  });
  const balanceValue = balance ?? selfAccount?.balance ?? 0;
  const chargeBalance =
    effectivePayFrom === "partner"
      ? Number(partnerAccount?.balance ?? 0)
      : balanceValue;
  const payWithAbonement = paySource !== "balance";
  const selectedInSpend =
    selected != null && tariffWithinSpend(selected.price);
  const carPartners = useMemo(() => {
    const car =
      payCars.find((row) => row.id === (payCarId ?? carIdFromQuery)) ??
      payCars.find((row) => row.car_plate === payCarPlate) ??
      null;
    return (car?.partners ?? []).filter((partner) => partner.id > 0);
  }, [payCars, payCarId, carIdFromQuery, payCarPlate]);

  const mustChooseBalance =
    spendReady && carPartners.length > 0 && paySource === "balance";
  const balanceReady = !mustChooseBalance || balancePicked;
  const canAffordBalance =
    selected != null &&
    selectedInSpend &&
    balanceReady &&
    Number.isFinite(chargeBalance) &&
    chargeBalance >= selected.price;
  const selfAvailable =
    selected == null ||
    (Number.isFinite(balanceValue) && balanceValue + 0.0001 >= selected.price);
  const canAfford =
    selected != null &&
    selectedInSpend &&
    balanceReady &&
    (payWithAbonement || canAffordBalance);
  const locked =
    step === "processing" ||
    step === "preparing" ||
    step === "washing" ||
    step === "success";

  const goMap = () => {
    stopWashDoneSound();
    router.push("/");
  };
  const finishWash = useCallback((info?: { status?: string; leftWithoutWash?: boolean }) => {
    const status = (info?.status ?? "completed").toLowerCase();
    const walkedAway = Boolean(info?.leftWithoutWash);
    setWashLeftBuilding(walkedAway);
    if (walkedAway || status === "completed") {
      setStep("success");
      return;
    }
    if (status === "cancelled" || status === "error") {
      setCanRetryPay(false);
      setPayError(
        status === "error"
          ? t("wash.session_failed", "Сессия мойки завершилась с ошибкой")
          : t("wash.session_cancelled", "Мойка отменена"),
      );
      setStep("error");
      return;
    }
    setStep("success");
  }, [t]);
  const startWash = useCallback(() => setStep("washing"), []);

  useEffect(() => {
    if (step === "success") {
      startWashDoneSound();
      return () => stopWashDoneSound();
    }

    if (
      step === "processing" ||
      step === "preparing" ||
      step === "washing"
    ) {
      armWashDoneSound();
      return;
    }

    stopWashDoneSound();
  }, [step]);

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
      setPayErrorCode(null);
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
    armWashDoneSound();
    setPayError(null);
    setPayErrorCode(null);
    setCanRetryPay(true);
    setWashLeftBuilding(false);

    const cwId = /^\d+$/.test(station.id) ? Number.parseInt(station.id, 10) : null;
    if (cwId != null && Number.isFinite(cwId)) {
      try {
        const check = await fetchCwCanPay(cwId, payCarId ?? undefined);
        if (!check.ok) {
          if (
            check.code === "active_wash" &&
            check.session_id != null &&
            check.location_id != null
          ) {
            router.replace(
              washSessionPath(check.location_id, check.session_id),
            );
            return;
          }
          setPayErrorCode(check.code ?? "not_on_territory");
          setStep("error");
          return;
        }
      } catch {
        setPayErrorCode("not_on_territory");
        setStep("error");
        return;
      }
    }

    if (cwId != null && !selectedInSpend) {
      setPayErrorCode("spend_limit");
      setStep("error");
      return;
    }

    setStep("processing");

    try {
      const description = `${station.paymentTitle} · ${selected.title}`;
      const evId = parseEvStationId(station.id);
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
          ...(payCarId != null ? { car_id: payCarId } : {}),
          ...abonPayload,
          ...(payWithAbonement
            ? {}
            : {
                pay_from: effectivePayFrom,
                ...(effectivePayFrom === "partner" &&
                (partnerId ?? partnerAccount?.partner_user_id)
                  ? {
                      partner_id:
                        partnerId ?? partnerAccount?.partner_user_id,
                    }
                  : {}),
              }),
        });
        const sessionId = paid.session?.id ?? null;
        if (sessionId == null) {
          throw new Error(t("payment.failed", "Не удалось оплатить"));
        }
        setWashSessionId(sessionId);
        setWashSessionStatus(paid.session?.status ?? "pending");
        // Только пост ЭТОЙ сессии — bay.washer_id может быть чужим (FIFO invite)
        setWashWasherId(paid.session?.washer_id ?? null);
        setWashBayNumber(paid.session?.bay_number ?? null);
        setWashStartAt(paid.session?.start_at ?? null);
        setWashTariffTitle(selected.title);
        setWashPrice(selected.price);
        await refreshBalance();
        router.replace(`/payment/car-wash/${cwId}?session=${sessionId}`);
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
      const body =
        err instanceof ApiError
          ? (err.body as {
              message?: string;
              code?: string;
              errors?: Record<string, string[]>;
            } | null)
          : null;
      const code = washPayCheckCodeFromApi(body);
      if (code) {
        setPayErrorCode(code);
        setPayError(null);
      } else {
        setPayErrorCode(null);
        setPayError(
          paymentErrorMessage(
            err,
            t,
            locale,
            t("payment.failed", "Не удалось оплатить"),
          ),
        );
      }
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
              initialBayNumber={washBayNumber}
              initialCarPlate={payCarPlate}
              onCarPlate={(plate) => {
                if (plate) setPayCarPlate(plate);
              }}
              onReady={(info) => {
                if (info?.status) setWashSessionStatus(info.status);
                if (info?.washerId != null) setWashWasherId(info.washerId);
                if (info?.bayNumber != null) setWashBayNumber(info.bayNumber);
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
              tariffTitle={
                washTariffTitle ??
                selected?.title ??
                t("payment.tariff", "Тариф")
              }
              price={washPrice ?? selected?.price ?? 0}
              washerId={washWasherId}
              bayNumber={washBayNumber}
              startAt={washStartAt}
              carPlate={payCarPlate}
              onDone={finishWash}
            />
          </div>
        ) : null}

        {step === "processing" ? (
          <div className="profile-edit__main ev-pay-status ev-pay-status--center" role="status">
            <span className="profile-boot__spinner ev-pay-status__spinner" aria-hidden />
            <h1 className="ev-pay-status__title">
              {resumeSessionParam && !resumeReady
                ? t("wash.resuming", "Открываем мойку…")
                : t("payment.processing", "Оплата...")}
            </h1>
            <p className="ev-pay-status__text">
              {resumeSessionParam && !resumeReady
                ? t("wash.resuming_text", "Проверяем статус сессии")
                : t("payment.deducting", "Списываем с баланса")}
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
              {payCarPlate ? (
                <p
                  className="cw-car-plate ev-pay-status__plate"
                  title={t("wash.your_car", "Ваша машина")}
                >
                  {formatCarPlate(payCarPlate)}
                </p>
              ) : null}
              <p className="ev-pay-status__text">
                {washLeftBuilding
                  ? t(
                      "wash.left_building_done",
                      "Вы вышли из здания. Оплата уже прошла — мойка завершена.",
                    )
                  : t("payment.success", "Оплата прошла успешно")}
                {!washLeftBuilding && (washPrice != null || selected)
                  ? `. ${Math.round(washPrice ?? selected?.price ?? 0)} ₸ · ${
                      washTariffTitle ?? selected?.title ?? ""
                    }`
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
            {payErrorCode === "must_exit_building" ? (
              <img
                className="cw-pay__notice-illust"
                src="/img/illustrations/cw_event_3.png"
                alt=""
                aria-hidden
              />
            ) : (
              <div className="ev-pay-status__badge is-fail" aria-hidden>
                <IconFail />
              </div>
            )}
            <h1 className="ev-pay-status__title">
              {payErrorCode
                ? washPayCheckTitle(t, payErrorCode, locale)
                : canRetryPay
                  ? t("ev.pay_error_title", "Ошибка оплаты")
                  : payError || t("wash.session_cancelled", "Мойка отменена")}
            </h1>
            <p className="ev-pay-status__text">
              {payErrorCode
                ? washPayCheckMessage(t, payErrorCode, locale)
                : canRetryPay
                  ? payError ||
                    t(
                      "ev.pay_error_text",
                      "Процесс оплаты был прерван по техническим причинам.",
                    )
                  : t(
                      "wash.session_ended_text",
                      "Сессия уже закрыта. Повторно списывать оплату не нужно.",
                    )}
            </p>
            <div className="ev-pay-status__footer">
              <div className="ev-pay-status__actions">
                {canRetryPay ? (
                  <button
                    type="button"
                    className="theme-button w-full"
                    onClick={() => void handlePay()}
                  >
                    {t("common.retry", "Повторить")}
                  </button>
                ) : (
                  <button type="button" className="theme-button w-full" onClick={goMap}>
                    {t("common.done", "Готово")}
                  </button>
                )}
                <button
                  type="button"
                  className="theme-button-secondary w-full"
                  onClick={() => {
                    setStep("form");
                    setPayError(null);
                    setPayErrorCode(null);
                  }}
                >
                  {t("ev.to_home_short", "Назад")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "form" && resumeReady ? (
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
                {payCarPlate ? (
                  <div className="profile-card__balance-item">
                    <p className="profile-card__balance-label">
                      {t("wash.your_car", "Ваша машина")}
                    </p>
                    <p className="profile-card__balance-value">
                      {formatCarPlate(payCarPlate)}
                    </p>
                  </div>
                ) : null}
                {!spendReady ? (
                  <div className="profile-card__balance-item">
                    <p className="profile-card__balance-label">
                      {t("home.balance", "Баланс")}
                    </p>
                    <p className="profile-card__balance-value">…</p>
                  </div>
                ) : carPartners.length > 0 ? (
                  <button
                    type="button"
                    className="profile-card__balance-item cw-pay__balance-pick"
                    onClick={() => setBalanceDrawerOpen(true)}
                  >
                    <p className="profile-card__balance-label">
                      {!balancePicked
                        ? payPhrase(t, "pick_balance", locale)
                        : payingFromPartner
                          ? partnerAccount?.name?.trim() ||
                            partnerAccount?.phone ||
                            payPhrase(t, "pay_company", locale)
                          : payPhrase(t, "pay_self", locale)}
                    </p>
                    <p className="profile-card__balance-value">
                      {!balancePicked
                        ? payPhrase(t, "not_chosen", locale)
                        : payingFromPartner && spendSnapshot
                          ? limitFraction(spendSnapshot.left, spendSnapshot.limit)
                          : balanceLoading && balance == null
                            ? "…"
                            : formatBalance(balanceValue)}
                    </p>
                  </button>
                ) : (
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
                )}
              </div>
            </section>

            {abonCards.length > 0 ? (
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
                        {payFrom === "partner" && hasPartnerPay ? null : (
                          <span className="cw-pay__tariff-desc">
                            {balanceLoading && balance == null
                              ? "…"
                              : formatBalance(balanceValue)}
                          </span>
                        )}
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
            ) : null}

            <section className="profile-card">
              <div className="profile-card__balance">
                <p className="cw-pay__title">{t("payment.tariffs", "Тарифы")}</p>
                {applySpend && spendReady && !spendSnapshot ? (
                  <p className="cw-pay__tariff-desc">
                    {payPhrase(t, "no_month_limit", locale)}
                  </p>
                ) : null}
                <div
                  className="cw-pay__tariffs"
                  role="radiogroup"
                  aria-label={t("payment.tariffs", "Тарифы")}
                >
                  {tariffs.map((tariffRow) => {
                    const key =
                      tariffRow.id != null ? String(tariffRow.id) : tariffRow.title;
                    const isSelected = selectedTariffKey === key;
                    const inSpend = tariffWithinSpend(tariffRow.price);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`cw-pay__tariff${isSelected ? " is-on" : ""}${
                          !inSpend ? " is-disabled" : ""
                        }`}
                        disabled={locked || !inSpend}
                        onClick={() => setSelectedTariffKey(key)}
                      >
                        <RadioMark checked={isSelected} />
                        <span className="cw-pay__tariff-body">
                          <span className="cw-pay__tariff-title">{tariffRow.title}</span>
                          {tariffRow.description ? (
                            <span className="cw-pay__tariff-desc">
                              {tariffRow.description}
                            </span>
                          ) : null}
                          {!inSpend ? (
                            <span className="cw-pay__tariff-desc">
                              {payPhrase(t, "out_of_spend", locale)}
                            </span>
                          ) : null}
                          {tariffRow.items && tariffRow.items.length > 0 ? (
                            <ul className="cw-pay__tariff-items">
                              {tariffRow.items.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </span>
                        <span className="cw-pay__tariff-price">
                          {formatBalance(tariffRow.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {presenceCode ? (
              <section className="profile-card" role="status">
                <div className="profile-card__balance">
                  {presenceCode === "not_on_territory" ? (
                    <img
                      className="cw-pay__notice-illust"
                      src="/img/illustrations/empty_territory.png"
                      alt=""
                      aria-hidden
                    />
                  ) : null}
                  {presenceCode === "active_wash" ? (
                    <img
                      className="cw-pay__notice-illust"
                      src="/img/illustrations/cw_event_2.png"
                      alt=""
                      aria-hidden
                    />
                  ) : null}
                  {presenceCode === "must_exit_building" ? (
                    <img
                      className="cw-pay__notice-illust"
                      src="/img/illustrations/cw_event_3.png"
                      alt=""
                      aria-hidden
                    />
                  ) : null}
                  <p className="cw-pay__title">
                    {washPayCheckTitle(t, presenceCode, locale)}
                  </p>
                  <p className="cw-pay__hint is-danger">
                    {washPayCheckMessage(t, presenceCode, locale)}
                  </p>
                </div>
              </section>
            ) : null}

            {selected ? (
              <div className="ev-pay__actions">
                <button
                  type="button"
                  className="theme-button w-full"
                  disabled={
                    !canAfford || locked || balanceLoading || Boolean(presenceCode)
                  }
                  onClick={() => void handlePay()}
                >
                  {station.kind === "charging"
                    ? t("payment.pay_charge", "Оплатить зарядку")
                    : t("payment.pay_wash", "Оплатить мойку")}
                </button>
              </div>
            ) : null}
            {balanceDrawerOpen && carPartners.length > 0
              ? createPortal(
                  <div className="cw-pay-sheet" role="presentation">
                    <button
                      type="button"
                      className="cw-pay-sheet__backdrop"
                      aria-label={t("common.close", "Закрыть")}
                      onClick={() => setBalanceDrawerOpen(false)}
                    />
                    <div
                      className="cw-pay-sheet__panel"
                      role="dialog"
                      aria-modal="true"
                      aria-label={payPhrase(t, "which_balance", locale)}
                    >
                      <div className="cw-pay-sheet__head">
                        <p className="cw-pay-sheet__title">
                          {payPhrase(t, "which_balance", locale)}
                        </p>
                        <button
                          type="button"
                          className="cw-pay-sheet__close"
                          onClick={() => setBalanceDrawerOpen(false)}
                        >
                          ×
                        </button>
                      </div>
                      <div
                        className="cw-pay-sheet__list"
                        role="radiogroup"
                        aria-label={payPhrase(t, "which_balance", locale)}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={balancePicked && payFrom !== "partner"}
                          aria-disabled={!selfAvailable}
                          disabled={!selfAvailable}
                          className={`cw-pay-sheet__option${
                            balancePicked && payFrom !== "partner" ? " is-on" : ""
                          }`}
                          onClick={() => {
                            if (!selfAvailable) return;
                            setPayFrom("self");
                            setBalancePicked(true);
                            setBalanceDrawerOpen(false);
                          }}
                        >
                          <RadioMark checked={balancePicked && payFrom !== "partner"} />
                          <span className="cw-pay-sheet__option-body">
                            <span className="cw-pay-sheet__option-title">
                              {payPhrase(t, "pay_self", locale)}
                            </span>
                            <span className="cw-pay-sheet__option-desc">
                              {formatBalance(balanceValue)}
                            </span>
                          </span>
                          <span
                            className={`cw-pay-sheet__badge${
                              selfAvailable ? " is-ok" : ""
                            }`}
                          >
                            {selfAvailable
                              ? payPhrase(t, "available", locale)
                              : payPhrase(t, "not_available", locale)}
                          </span>
                        </button>
                        {carPartners.map((partner) => {
                          const account = paymentAccounts.find(
                            (row) =>
                              row.id === "partner" &&
                              row.partner_user_id === partner.id,
                          );
                          const title =
                            partner.name?.trim() ||
                            account?.name?.trim() ||
                            partner.phone ||
                            account?.phone ||
                            `#${partner.id}`;
                          const left =
                            partner.spend_month_left != null &&
                            Number.isFinite(Number(partner.spend_month_left))
                              ? Number(partner.spend_month_left)
                              : null;
                          const limit =
                            partner.spend_month != null &&
                            Number.isFinite(Number(partner.spend_month))
                              ? Number(partner.spend_month)
                              : null;
                          const price = selected?.price;
                          const wallet = Number(account?.balance ?? 0);
                          const walletCovers =
                            price == null ||
                            (Number.isFinite(wallet) && wallet + 0.0001 >= price);
                          const available =
                            left != null &&
                            (price == null || price - 0.0001 <= left) &&
                            walletCovers;
                          const checked =
                            balancePicked &&
                            payFrom === "partner" &&
                            partnerId === partner.id;
                          const limitLine =
                            left != null && limit != null
                              ? limitFraction(left, limit)
                              : payPhrase(t, "no_month_limit", locale);
                          return (
                            <button
                              key={partner.id}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              aria-disabled={!available}
                              disabled={!available}
                              className={`cw-pay-sheet__option${checked ? " is-on" : ""}`}
                              onClick={() => {
                                if (!available) return;
                                setPayFrom("partner");
                                setPartnerId(partner.id);
                                setBalancePicked(true);
                                setBalanceDrawerOpen(false);
                              }}
                            >
                              <RadioMark checked={checked} />
                              <span className="cw-pay-sheet__option-body">
                                <span className="cw-pay-sheet__option-title">
                                  {title}
                                </span>
                                <span className="cw-pay-sheet__option-desc">
                                  {limitLine}
                                </span>
                              </span>
                              <span
                                className={`cw-pay-sheet__badge${
                                  available ? " is-ok" : ""
                                }`}
                              >
                                {available
                                  ? payPhrase(t, "available", locale)
                                  : payPhrase(t, "not_available", locale)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
