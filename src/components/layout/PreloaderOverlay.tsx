"use client";

import PreloaderStage from "@/features/profile/components/PreloaderStage";
import { usePreloaderVariant } from "@/hooks/usePreloaderVariant";
import "@/features/profile/components/preloader-preview.css";

type PreloaderOverlayProps = {
  mode?: "fullscreen" | "inline";
  size?: number;
  label?: string;
  className?: string;
};

export default function PreloaderOverlay({
  mode = "fullscreen",
  size,
  label = "Загрузка",
  className = "",
}: PreloaderOverlayProps) {
  const { variant, mounted, isDefault } = usePreloaderVariant();
  const markSize = size ?? (mode === "fullscreen" ? 176 : 148);
  const showCircleIcon = !(isDefault && variant.startsWith("circle-"));
  const rootClass =
    mode === "fullscreen"
      ? `app-preloader${className ? ` ${className}` : ""}`
      : `map-loading${className ? ` ${className}` : ""}`;

  if (!mounted) return null;

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-label={label}>
      <PreloaderStage
        variant={variant}
        size={markSize}
        showCircleIcon={showCircleIcon}
      />
    </div>
  );
}
