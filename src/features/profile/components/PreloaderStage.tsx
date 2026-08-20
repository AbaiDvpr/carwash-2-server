"use client";

import PreloaderIconMark from "./PreloaderIconMark";
import { circleAnimClass, isComboVariant, type PreloaderVariant } from "./preloaderVariants";

type PreloaderStageProps = {
  variant: PreloaderVariant;
  size?: number;
  /** Для circle-*: показывать иконку внутри (стандартный — без) */
  showCircleIcon?: boolean;
};

export default function PreloaderStage({
  variant,
  size = 72,
  showCircleIcon = true,
}: PreloaderStageProps) {
  if (isComboVariant(variant)) {
    if (variant === "combo-grad-h-double") {
      return (
        <div
          className="preloader-combo preloader-combo--grad-h-double"
          style={{ width: size, height: size }}
          aria-hidden
        >
          <PreloaderIconMark variant="grad-sweep-h" size={Math.round(size * 0.52)} />
        </div>
      );
    }
  }

  if (variant.startsWith("circle-")) {
    const anim = circleAnimClass(variant);
    return (
      <div
        className={`preloader-circle preloader-circle--${anim}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {showCircleIcon ? (
          <PreloaderIconMark variant="icon-static" size={Math.round(size * 0.52)} />
        ) : null}
      </div>
    );
  }

  return <PreloaderIconMark variant={variant} size={size} />;
}
