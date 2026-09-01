"use client";

import { useEffect } from "react";
import PreloaderStage from "@/features/profile/components/PreloaderStage";
import { usePreloaderVariant } from "@/hooks/usePreloaderVariant";
import { useT } from "@/hooks/useT";
import "@/features/charging/charging-session-variants.css";
import "@/features/profile/components/preloader-preview.css";
import "./wash-session.css";
import "./wash-prepare-timer.css";

export const WASH_PREPARE_MS = 40_000;

function WashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

type WashPrepareTimerProps = {
  onDone: () => void;
};

export default function WashPrepareTimer({ onDone }: WashPrepareTimerProps) {
  const t = useT();
  const { variant, mounted, isDefault } = usePreloaderVariant();
  const showCircleIcon = !(isDefault && variant.startsWith("circle-"));

  useEffect(() => {
    const id = window.setTimeout(() => onDone(), WASH_PREPARE_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

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
          <div
            className="wash-prep__preloader"
            aria-label={t("wash.queue_title", "Вы в очереди")}
          >
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
          <p className="csv-params__title">
            {t("wash.queue_title", "Вы в очереди")}
          </p>
          <p className="wash-prep__hint">
            {t(
              "wash.queue_text",
              "Как освободится место — мы вас пригласим.",
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
