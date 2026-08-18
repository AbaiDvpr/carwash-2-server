"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useStation } from "@/hooks/useStation";
import { useT } from "@/hooks/useT";
import EvChargeCheckout, {
  CHARGE_MS,
  type EvCheckoutLimits,
} from "@/features/home/components/EvChargeCheckout";
import type { EvChargeStep } from "@/features/home/components/EvChargeFlow";
import ChargingSessionView, {
  CHARGING_UI_VARIANTS,
  readChargingUiVariant,
  writeChargingUiVariant,
  type ChargingUiVariant,
} from "@/features/charging/ChargingSessionView";
import {
  fetchEvSession,
  plannedEndAtMs,
  updateEvSession,
  evStationIdFromLocation,
  type EvSession,
} from "@/lib/api/evSessions";
import { ApiError } from "@/lib/api";
import "@/features/home/components/map.css";
import "@/features/profile/components/profile.css";
import "./details-charging.css";
import "./charging-session-variants.css";

type DetailsChargingPageProps = {
  /** ID сессии в БД (ev_sessions.id) */
  id: string;
};

function stepFromSession(session: EvSession): EvChargeStep {
  const status = session.status ?? "";
  if (status === "pending" || status === "completed") return "charged_ok";
  return "charging";
}

function limitsFromSession(session: EvSession): EvCheckoutLimits {
  const mode = session.limit_mode ?? "charge";
  const value = session.limit_value ?? 100;
  if (mode === "price") {
    return { tab: "price", priceLimit: value, chargeTo: 100, minutes: 30 };
  }
  if (mode === "time") {
    return { tab: "time", priceLimit: 5_000, chargeTo: 100, minutes: value };
  }
  return { tab: "charge", priceLimit: 5_000, chargeTo: value, minutes: 30 };
}

export default function DetailsChargingPage({ id }: DetailsChargingPageProps) {
  const t = useT();
  const router = useRouter();
  const sessionId = Number(id);
  const validId = Number.isFinite(sessionId) && sessionId > 0;

  const [evSession, setEvSession] = useState<EvSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFoundSession, setNotFoundSession] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<EvChargeStep>("charging");
  const [chargeEndsAt, setChargeEndsAt] = useState<number | null>(null);
  const [variant, setVariant] = useState<ChargingUiVariant>("original");
  const [cancelNote, setCancelNote] = useState(false);

  const stationId = evSession
    ? evStationIdFromLocation(evSession.location_id)
    : "";
  const { station, loading, error, notFound } = useStation(stationId);

  const reloadSession = useCallback(async () => {
    if (!validId) {
      setNotFoundSession(true);
      setLoadError(null);
      setEvSession(null);
      setReady(true);
      return;
    }
    try {
      const session = await fetchEvSession(sessionId);
      setEvSession(session);
      setStep(stepFromSession(session));
      setChargeEndsAt(plannedEndAtMs(session));
      setLoadError(null);
      setNotFoundSession(false);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const body = apiErr
        ? (apiErr.body as { message?: string; code?: string } | null)
        : null;
      const missing =
        apiErr?.status === 404 ||
        body?.code === "session_not_found" ||
        body?.code === "not_found";
      setEvSession(null);
      if (missing) {
        setNotFoundSession(true);
        setLoadError(null);
      } else {
        setNotFoundSession(false);
        setLoadError(
          body?.message ??
            (err instanceof Error
              ? err.message
              : t("ev.session_load_error", "Не удалось загрузить сессию")),
        );
      }
    } finally {
      setReady(true);
    }
  }, [sessionId, validId, t]);

  useEffect(() => {
    setVariant(readChargingUiVariant());
    void reloadSession();
  }, [reloadSession]);

  useEffect(() => {
    if (!cancelNote) return;
    const tmr = window.setTimeout(() => setCancelNote(false), 3200);
    return () => window.clearTimeout(tmr);
  }, [cancelNote]);

  const stand = useMemo(() => {
    if (!station || !evSession) return null;
    const stands = station.chargerStands ?? [];
    if (evSession.charger_id != null) {
      return stands.find((s) => s.id === evSession.charger_id) ?? stands[0] ?? null;
    }
    return stands[0] ?? null;
  }, [station, evSession]);

  const port = useMemo(() => {
    if (!stand || !evSession) return null;
    if (evSession.pistol_id != null) {
      return (
        stand.ports.find((p) => p.id === evSession.pistol_id) ??
        stand.ports[0] ??
        null
      );
    }
    return stand.ports[0] ?? null;
  }, [stand, evSession]);

  const limits = useMemo(
    () => (evSession ? limitsFromSession(evSession) : null),
    [evSession],
  );

  async function onStepChange(next: EvChargeStep) {
    setStep(next);
    if (next === "charged_ok" && evSession && evSession.status === "charging") {
      try {
        const updated = await updateEvSession(evSession.id, {
          status: "pending",
          amount: evSession.amount ?? undefined,
        });
        setEvSession(updated);
        setChargeEndsAt(null);
      } catch {
        /* UI всё равно покажет оплату */
      }
    }
  }

  function onChargeEndsAt(endsAt: number) {
    setChargeEndsAt(endsAt);
  }

  function goToMap() {
    router.push("/");
  }

  function selectVariant(next: ChargingUiVariant) {
    setVariant(next);
    writeChargingUiVariant(next);
  }

  if (!ready || (evSession && loading)) {
    return (
      <PageLayout title={t("ev.charging_title", "Идёт зарядка")} className="page--profile-edit">
        <div className="profile-edit">
          <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </PageLayout>
    );
  }

  if (notFoundSession) {
    return (
      <PageLayout title={t("ev.charging_title", "Идёт зарядка")} className="page--profile-edit">
        <div className="profile-edit details-charging">
          <div className="app-back-bar app-back-bar--overlay app-back-bar--stack details-charging__top">
            <BackButton onClick={goToMap}>
              {t("common.back", "Назад")}
            </BackButton>
          </div>
          <div className="details-charging__empty" role="status">
            <span className="details-charging__empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m16.2 16.2 4.3 4.3" />
                <path strokeLinecap="round" d="M8.8 11h4.4" />
              </svg>
            </span>
            <h1 className="details-charging__empty-title">
              {t("common.nothing_found", "Ничего не нашли")}
            </h1>
            <p className="details-charging__empty-text">
              {t(
                "ev.session_not_found_text",
                "Сессия зарядки не найдена или больше недоступна.",
              )}
            </p>
            <button type="button" className="theme-button w-full" onClick={goToMap}>
              {t("common.to_map", "На карту")}
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loadError || !evSession || notFound || error || !station || !stand || !port || !limits) {
    return (
      <PageLayout title={t("ev.charging_title", "Идёт зарядка")} className="page--profile-edit">
        <div className="profile-edit details-charging">
          <div className="app-back-bar app-back-bar--overlay app-back-bar--stack details-charging__top">
            <BackButton onClick={goToMap}>
              {t("common.back", "Назад")}
            </BackButton>
          </div>
          <div className="details-charging__empty" role="alert">
            <h1 className="details-charging__empty-title">
              {loadError ||
                (notFound
                  ? t("station.not_found", "Точка не найдена")
                  : error || t("station.load_error", "Не удалось загрузить"))}
            </h1>
            <p className="details-charging__empty-text">
              {t(
                "ev.session_load_hint",
                "Попробуй открыть услугу снова с карты.",
              )}
            </p>
            <button type="button" className="theme-button w-full" onClick={goToMap}>
              {t("common.to_map", "На карту")}
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("ev.charging_title", "Идёт зарядка")} className="page--profile-edit">
      <div className="profile-edit details-charging">
        <div className="app-back-bar app-back-bar--overlay app-back-bar--stack details-charging__top">
          <BackButton onClick={goToMap}>
            {t("common.back", "Назад")}
          </BackButton>
          {step === "charging" ? (
            <div
              className="details-charging__variants"
              role="tablist"
              aria-label={t("ev.ui_variants", "Варианты экрана")}
            >
              {CHARGING_UI_VARIANTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={variant === item.id}
                  className={`details-charging__variant${variant === item.id ? " is-on" : ""}`}
                  onClick={() => selectVariant(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="details-charging__stage">
          {step === "charging" ? (
            <ChargingSessionView
              variant={variant}
              step={step}
              onStepChange={(next) => void onStepChange(next)}
              port={port}
              stand={stand}
              station={station}
              limits={limits}
              chargeEndsAt={chargeEndsAt ?? Date.now() + CHARGE_MS}
              onChargeEndsAt={onChargeEndsAt}
              cancelNote={cancelNote}
              onCancelNote={() => setCancelNote(true)}
            />
          ) : (
            <EvChargeCheckout
              step="charged_ok"
              onStepChange={(next) => void onStepChange(next)}
              port={port}
              stand={stand}
              station={station}
              limits={limits}
              chargeEndsAt={null}
              onChargeEndsAt={onChargeEndsAt}
              dbSessionId={evSession.id}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
