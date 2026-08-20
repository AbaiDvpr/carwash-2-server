"use client";

import {
  PRELOADER_SVG_SRC,
  gradAnimClass,
  iconAnimClass,
  isGradientVariant,
  isIconVariant,
  type PreloaderVariant,
} from "./preloaderVariants";

type PreloaderIconMarkProps = {
  variant: PreloaderVariant;
  className?: string;
  size?: number;
};

function resolveAnim(variant: PreloaderVariant): {
  anim: string;
  isGrad: boolean;
} {
  if (isGradientVariant(variant)) {
    return { anim: gradAnimClass(variant), isGrad: true };
  }
  if (isIconVariant(variant)) {
    return { anim: iconAnimClass(variant), isGrad: false };
  }
  return { anim: "static", isGrad: false };
}

function usesMaskedGradient(anim: string, isGrad: boolean): boolean {
  if (isGrad) return true;
  return anim === "sweep" || anim === "rotate" || anim === "wave";
}

const MASK_STYLE = {
  WebkitMaskImage: `url(${PRELOADER_SVG_SRC})`,
  maskImage: `url(${PRELOADER_SVG_SRC})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  maskMode: "alpha",
} as const;

export default function PreloaderIconMark({
  variant,
  className = "",
  size = 88,
}: PreloaderIconMarkProps) {
  const { anim, isGrad } = resolveAnim(variant);
  const masked = usesMaskedGradient(anim, isGrad);

  const classNames = [
    "preloader-mark",
    isGrad ? "preloader-mark--grad" : "",
    `preloader-mark--${isGrad ? `grad-${anim}` : anim}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (masked) {
    return (
      <div
        className={classNames}
        style={{ width: size, height: size, ...MASK_STYLE }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={classNames}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="preloader-mark__icon"
        src={PRELOADER_SVG_SRC}
        alt=""
        draggable={false}
      />
    </div>
  );
}
