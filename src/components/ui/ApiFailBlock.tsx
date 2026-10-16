"use client";

import { useT } from "@/hooks/useT";
import "./api-fail.css";

type ApiFailBlockProps = {
  variant?: "fill" | "inline";
  onRetry?: () => void;
};

export default function ApiFailBlock({
  variant = "inline",
  onRetry,
}: ApiFailBlockProps) {
  const t = useT();
  return (
    <div className={`api-fail api-fail--${variant}`} role="alert">
      <p className="api-fail__title">{t("common.api_error", "Ошибка")}</p>
      <p className="api-fail__text">
        {t("common.api_error_hint", "Обновите приложение")}
      </p>
      {onRetry ? (
        <button type="button" className="api-fail__retry" onClick={onRetry}>
          {t("common.refresh", "Обновить")}
        </button>
      ) : null}
    </div>
  );
}
