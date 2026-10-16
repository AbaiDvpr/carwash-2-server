"use client";

import { useEffect, useRef, useState } from "react";
import PreloaderStage from "@/features/profile/components/PreloaderStage";
import { usePreloaderVariant } from "@/hooks/usePreloaderVariant";
import { useT } from "@/hooks/useT";
import { fetchCwSession, washLeftWithoutWash } from "@/lib/api/sessions";
import { formatCarPlate } from "@/features/map/wash/formatCarPlate";
import { armWashDoneSound, playQueueBeep, stopQueueBeep } from "@/features/map/wash/washSounds";
import { vibrate } from "@/lib/vibrateController";
import "@/features/map/charging/charging-session-variants.css";
import "@/features/profile/components/preloader-preview.css";
import "./wash-session.css";
import "./wash-prepare-timer.css";

/** Как часто спрашиваем статус сессии в очереди / invite. */
export const WASH_STATUS_POLL_MS = 3_000;
/** Интервал повторной вибрации на экране «Вас ждут». */
const INVITE_VIBRATE_INTERVAL_MS = 10_000;
/** Сколько раз максимум вибрируем, пока статус invited. */
const INVITE_VIBRATE_MAX = 3;

type WashPrepareTimerProps = {
  sessionId: number;
  initialStatus?: string | null;
  initialWasherId?: number | null;
  initialBayNumber?: number | null;
  initialCarPlate?: string | null;
  onCarPlate?: (plate: string | null) => void;
  /** Статус in_progress — можно идти к экрану мойки. */
  onReady: (info?: {
    washerId: number | null;
    bayNumber: number | null;
    status: string;
  }) => void;
  /** Сессия уже completed / cancelled / error. */
  onFinished?: (info?: { status: string; leftWithoutWash?: boolean }) => void;
};

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "pending").toLowerCase();
}

export default function WashPrepareTimer({
  sessionId,
  initialStatus = "pending",
  initialWasherId = null,
  initialBayNumber = null,
  initialCarPlate = null,
  onCarPlate,
  onReady,
  onFinished,
}: WashPrepareTimerProps) {
  const t = useT();
  const { variant, mounted, isDefault } = usePreloaderVariant();
  const showCircleIcon = !(isDefault && variant.startsWith("circle-"));

  const [status, setStatus] = useState(() => normalizeStatus(initialStatus));
  const [washerId, setWasherId] = useState<number | null>(
    initialWasherId != null && Number.isFinite(initialWasherId)
      ? initialWasherId
      : null,
  );
  const [bayNumber, setBayNumber] = useState<number | null>(
    initialBayNumber != null && Number.isFinite(initialBayNumber)
      ? initialBayNumber
      : null,
  );
  const [carPlate, setCarPlate] = useState<string | null>(
    initialCarPlate?.trim() ? initialCarPlate.trim() : null,
  );
  const [pollError, setPollError] = useState<string | null>(null);

  const onReadyRef = useRef(onReady);
  const onFinishedRef = useRef(onFinished);
  const onCarPlateRef = useRef(onCarPlate);
  const advancedRef = useRef(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);
  useEffect(() => {
    onCarPlateRef.current = onCarPlate;
  }, [onCarPlate]);

  useEffect(() => {
    const invited = status === "invited";
    if (!invited) {
      stopQueueBeep();
      return;
    }

    let cancelled = false;
    let gapTimer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      if (gapTimer != null) window.clearTimeout(gapTimer);
      gapTimer = window.setTimeout(() => {
        playOnce();
      }, 2_500);
    };

    const playOnce = () => {
      if (cancelled) return;
      playQueueBeep(scheduleNext);
    };

    armWashDoneSound();
    playOnce();
    const resumeAudio = () => {
      if (cancelled) return;
      armWashDoneSound();
    };
    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("touchstart", resumeAudio, { passive: true });

    return () => {
      cancelled = true;
      if (gapTimer != null) window.clearTimeout(gapTimer);
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("touchstart", resumeAudio);
      stopQueueBeep();
      armWashDoneSound();
    };
  }, [status]);

  /** invited → Web→Flutter { action: "vibrate", pattern: "invite" }, макс. 3 раза / 10 сек */
  useEffect(() => {
    if (status !== "invited") return;

    let cancelled = false;
    let count = 0;
    let timer: number | null = null;

    const pulse = () => {
      if (cancelled || count >= INVITE_VIBRATE_MAX) return;
      count += 1;
      vibrate("invite");
      if (count < INVITE_VIBRATE_MAX) {
        timer = window.setTimeout(pulse, INVITE_VIBRATE_INTERVAL_MS);
      }
    };

    pulse();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    advancedRef.current = false;

    const applyStatus = (
      next: string,
      nextWasherId: number | null,
      nextBayNumber: number | null,
      nextPlate: string | null,
      leftWithoutWash = false,
    ) => {
      if (cancelled) return;
      setStatus(next);
      if (nextWasherId != null) setWasherId(nextWasherId);
      if (nextBayNumber != null) setBayNumber(nextBayNumber);
      if (nextPlate) {
        setCarPlate(nextPlate);
        onCarPlateRef.current?.(nextPlate);
      }

      if (advancedRef.current) return;

      if (leftWithoutWash || next === "completed") {
        advancedRef.current = true;
        onFinishedRef.current?.({
          status: leftWithoutWash ? next || "cancelled" : "completed",
          leftWithoutWash,
        });
        return;
      }

      if (next === "cancelled" || next === "error") {
        advancedRef.current = true;
        onFinishedRef.current?.({ status: next });
        return;
      }

      if (next === "in_progress") {
        advancedRef.current = true;
        onReadyRef.current({
          washerId: nextWasherId,
          bayNumber: nextBayNumber,
          status: next,
        });
      }
    };

    const poll = async () => {
      try {
        const { session } = await fetchCwSession(sessionId);
        if (cancelled) return;
        setPollError(null);
        applyStatus(
          normalizeStatus(session.status),
          session.washer_id ?? null,
          session.bay_number ?? null,
          session.car_plate ?? null,
          washLeftWithoutWash(session),
        );
      } catch {
        if (!cancelled) {
          setPollError(
            t("wash.status_poll_error", "Не удалось обновить статус. Повторяем…"),
          );
        }
      }
    };

    applyStatus(
      normalizeStatus(initialStatus),
      initialWasherId ?? null,
      initialBayNumber ?? null,
      initialCarPlate ?? null,
    );
    void poll();
    const id = window.setInterval(() => void poll(), WASH_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только смена sessionId
  }, [sessionId, t]);

  const invited = status === "invited";
  const boxLabel =
    bayNumber != null
      ? String(bayNumber)
      : washerId != null
        ? String(washerId)
        : null;
  const boxTag = boxLabel ? `#${boxLabel}` : null;
  const plateLabel = formatCarPlate(carPlate);

  const title = invited
    ? t("wash.invited_title", "Вас ждут")
    : t("wash.queue_title", "Вы в очереди");

  const text = invited
    ? boxTag
      ? t(
          "wash.invited_enter_hash",
          "Заезжайте в бокс {tag} — мойка начнётся автоматически.",
        ).replace("{tag}", boxTag)
      : t("wash.invited_enter_box", "Зайдите, пожалуйста, внутрь бокса.")
    : t("wash.queue_text", "Как освободится место — мы вас пригласим.");

  return (
    <div
      className={`csv csv--refined wash-prep${invited ? " is-invited" : " is-queue"}`}
      role="status"
      aria-live="polite"
    >
      <section className="profile-card csv-shell wash-prep__card">
        <div className="csv-shell__head">
          <span
            className="csv-ev-badge csv-ev-badge--wash csv-ev-badge--inline"
            aria-hidden
          >
            <WashIcon />
            <span>{t("common.wash", "Мойка")}</span>
          </span>
          {plateLabel ? (
            <p className="cw-car-plate" title={t("wash.your_car", "Ваша машина")}>
              {plateLabel}
            </p>
          ) : null}
        </div>

        {invited ? (
          <div className="wash-prep__stage" aria-label={boxTag ?? title}>
            <div className="wash-prep__copy">
              <p className="wash-prep__title">{title}</p>
              <p className="wash-prep__hint">{text}</p>
              {pollError ? (
                <p className="wash-prep__hint wash-prep__hint--error">{pollError}</p>
              ) : null}
            </div>
            <p className="wash-prep__bay-tag">{boxTag ?? "#—"}</p>
          </div>
        ) : (
          <>
            <div className="wash-prep__stage">
              <div className="wash-prep__copy">
                <p className="wash-prep__title">{title}</p>
                <p className="wash-prep__hint">{text}</p>
                {pollError ? (
                  <p className="wash-prep__hint wash-prep__hint--error">{pollError}</p>
                ) : null}
              </div>
              <div className="wash-prep__preloader" aria-label={title}>
                {mounted ? (
                  <PreloaderStage
                    variant={variant}
                    size={120}
                    showCircleIcon={showCircleIcon}
                  />
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
