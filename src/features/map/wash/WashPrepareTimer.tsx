"use client";

import { useEffect, useRef, useState } from "react";
import PreloaderStage from "@/features/profile/components/PreloaderStage";
import { usePreloaderVariant } from "@/hooks/usePreloaderVariant";
import { useT } from "@/hooks/useT";
import { fetchCwSession } from "@/lib/api/sessions";
import "@/features/map/charging/charging-session-variants.css";
import "@/features/profile/components/preloader-preview.css";
import "./wash-session.css";
import "./wash-prepare-timer.css";

/** Как часто спрашиваем статус сессии в очереди. */
export const WASH_STATUS_POLL_MS = 10_000;

const QUEUE_SOUND_SRC = "/mp3/queue.mp3";

type WashPrepareTimerProps = {
  sessionId: number;
  initialStatus?: string | null;
  initialWasherId?: number | null;
  /** Статус in_progress — можно идти к экрану мойки. */
  onReady: (info?: { washerId: number | null; status: string }) => void;
  /** Сессия уже completed / cancelled / error. */
  onFinished?: () => void;
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
  const [pollError, setPollError] = useState<string | null>(null);

  const onReadyRef = useRef(onReady);
  const onFinishedRef = useRef(onFinished);
  const advancedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const invited = status === "invited";
    if (!invited) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(QUEUE_SOUND_SRC);
      audio.loop = false;
      audio.preload = "auto";
      audioRef.current = audio;
    } else {
      audio.loop = false;
    }

    let cancelled = false;
    let gapTimer: number | null = null;

    const playOnce = () => {
      if (cancelled || !audio) return;
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore seek errors before ready */
      }
      void audio.play().catch(() => {
        /* автоплей может быть заблокирован */
      });
    };

    const scheduleNext = () => {
      if (cancelled) return;
      if (gapTimer != null) window.clearTimeout(gapTimer);
      // Короткий mp3 (~0.4с) + пауза, чтобы не пищал непрерывно
      gapTimer = window.setTimeout(() => {
        playOnce();
      }, 2_500);
    };

    const onEnded = () => scheduleNext();
    audio.addEventListener("ended", onEnded);

    playOnce();
    const unlock = () => {
      if (cancelled || !audio) return;
      if (!audio.paused) return;
      playOnce();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      cancelled = true;
      if (gapTimer != null) window.clearTimeout(gapTimer);
      audio.removeEventListener("ended", onEnded);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.pause();
    };
  }, [status]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    advancedRef.current = false;

    const applyStatus = (next: string, nextWasherId: number | null) => {
      if (cancelled) return;
      setStatus(next);
      if (nextWasherId != null) setWasherId(nextWasherId);

      if (advancedRef.current) return;

      if (next === "completed" || next === "cancelled" || next === "error") {
        advancedRef.current = true;
        onFinishedRef.current?.();
        return;
      }

      if (next === "in_progress") {
        advancedRef.current = true;
        onReadyRef.current({ washerId: nextWasherId, status: next });
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
        );
      } catch {
        if (!cancelled) {
          setPollError(
            t("wash.status_poll_error", "Не удалось обновить статус. Повторяем…"),
          );
        }
      }
    };

    applyStatus(normalizeStatus(initialStatus), initialWasherId ?? null);
    void poll();
    const id = window.setInterval(() => void poll(), WASH_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, initialStatus, initialWasherId, t]);

  const invited = status === "invited";
  const boxLabel = washerId != null ? String(washerId) : null;
  const boxTag = boxLabel ? `#${boxLabel}` : null;

  const title = invited
    ? t("wash.invited_title", "Вас ждут")
    : t("wash.queue_title", "Вы в очереди");

  const text = invited
    ? boxTag
      ? t(
          "wash.invited_enter_hash",
          "Заезжайте в бокс {tag} — мойка начнётся автоматически.",
        ).replace("{tag}", boxTag)
      : t(
          "wash.invited_enter_box",
          "Зайдите, пожалуйста, внутрь бокса.",
        )
    : t(
        "wash.queue_text",
        "Как освободится место — мы вас пригласим.",
      );

  return (
    <div
      className={`csv csv--refined wash-prep${invited ? " is-invited" : " is-queue"}`}
      role="status"
      aria-live="polite"
    >
      <section className="profile-card csv-shell">
        <div className="csv-shell__head">
          <span
            className="csv-ev-badge csv-ev-badge--wash csv-ev-badge--inline"
            aria-hidden
          >
            <WashIcon />
            <span>{t("common.wash", "Мойка")}</span>
          </span>
        </div>

        <div className="csv-shell__body wash-prep__body">
          {invited ? (
            <div className="wash-prep__bay" aria-label={boxTag ?? title}>
              <p className="wash-prep__bay-tag">
                {boxTag ?? "#—"}
              </p>
            </div>
          ) : (
            <div className="wash-prep__preloader" aria-label={title}>
              {mounted ? (
                <PreloaderStage
                  variant={variant}
                  size={120}
                  showCircleIcon={showCircleIcon}
                />
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="profile-card csv-params">
        <div className="profile-card__balance">
          <p className="csv-params__title">{title}</p>
          <p className="wash-prep__hint">{text}</p>
          {pollError ? (
            <p className="wash-prep__hint wash-prep__hint--error">{pollError}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
