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
export const WASH_STATUS_POLL_MS = 5_000;

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
  const [soundBlocked, setSoundBlocked] = useState(false);

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

  // Звук приглашения: крутим queue.mp3, пока статус invited.
  useEffect(() => {
    const invited = status === "invited";
    if (!invited) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setSoundBlocked(false);
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(QUEUE_SOUND_SRC);
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;
    }

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled || !audio) return;
      void audio.play().then(
        () => {
          if (!cancelled) setSoundBlocked(false);
        },
        () => {
          if (!cancelled) setSoundBlocked(true);
        },
      );
    };

    tryPlay();
    const unlock = () => tryPlay();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio?.pause();
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

      // Мойку запускаем только когда клиент реально заехал в бокс.
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
  const title = invited
    ? t("wash.invited_title", "Вас пригласили")
    : t("wash.queue_title", "Вы в очереди");
  const text = invited
    ? washerId != null
      ? t(
          "wash.invited_enter_box_n",
          "Зайдите, пожалуйста, внутрь бокса №{n}.",
        ).replace("{n}", String(washerId))
      : t(
          "wash.invited_enter_box",
          "Зайдите, пожалуйста, внутрь бокса.",
        )
    : t(
        "wash.queue_text",
        "Как освободится место — мы вас пригласим.",
      );

  return (
    <div className="csv csv--refined wash-prep" role="status">
      <section className="profile-card csv-shell">
        <div className="csv-shell__head">
          <span className="csv-ev-badge csv-ev-badge--wash csv-ev-badge--inline" aria-hidden>
            <WashIcon />
            <span>{t("common.wash", "Мойка")}</span>
          </span>
        </div>

        <div className="csv-shell__body wash-prep__body">
          <div className="wash-prep__preloader" aria-label={title}>
            {mounted ? (
              <PreloaderStage
                variant={variant}
                size={132}
                showCircleIcon={showCircleIcon}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="profile-card csv-params">
        <div className="profile-card__balance">
          <p className="csv-params__title">{title}</p>
          <p className="wash-prep__hint">{text}</p>
          {invited && soundBlocked ? (
            <button
              type="button"
              className="theme-button wash-prep__sound-btn"
              onClick={() => {
                const audio = audioRef.current ?? new Audio(QUEUE_SOUND_SRC);
                audio.loop = true;
                audioRef.current = audio;
                void audio.play().then(
                  () => setSoundBlocked(false),
                  () => setSoundBlocked(true),
                );
              }}
            >
              {t("wash.enable_sound", "Включить звук")}
            </button>
          ) : null}
          {pollError ? (
            <p className="wash-prep__hint wash-prep__hint--error">{pollError}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
