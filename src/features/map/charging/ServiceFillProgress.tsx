"use client";

import { PRELOADER_SVG_SRC } from "@/features/profile/components/preloaderVariants";

type ServiceFillProgressProps = {
  percent: number;
  variant: "wash" | "charging";
  /** Скрыть цифры и шкалу 0–100% */
  showPercent?: boolean;
  /** Бесконечная заливка туда-обратно (ожидание event из БД) */
  indeterminate?: boolean;
};

const MASK_STYLE = {
  WebkitMaskImage: `url(${PRELOADER_SVG_SRC})`,
  maskImage: `url(${PRELOADER_SVG_SRC})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "119.07% 509.45%",
  maskSize: "119.07% 509.45%",
} as const;

function ScaleBar({ fill, variant }: { fill: number; variant: "wash" | "charging" }) {
  return (
    <div className="csv-scale" aria-hidden>
      <span>0%</span>
      <div className="csv-scale__track">
        <span
          className={`csv-scale__value csv-scale__value--${variant}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      <span>100%</span>
    </div>
  );
}

function MaskFillLogo({
  percent,
  variant,
  indeterminate,
}: {
  percent: number;
  variant: "wash" | "charging";
  indeterminate?: boolean;
}) {
  const fill = Math.min(100, Math.max(0, percent));

  return (
    <div
      className={`csv-fill-progress__mark${indeterminate ? " is-loop" : ""}`}
      style={indeterminate ? undefined : { ["--csv-fill" as string]: `${fill}%` }}
      aria-hidden
    >
      <span className="csv-fill-progress__shape csv-fill-progress__shape--empty" style={MASK_STYLE} />
      <span
        className={`csv-fill-progress__shape csv-fill-progress__shape--fill csv-fill-progress__shape--${variant}`}
        style={MASK_STYLE}
      />
    </div>
  );
}

export default function ServiceFillProgress({
  percent,
  variant,
  showPercent = true,
  indeterminate = false,
}: ServiceFillProgressProps) {
  const fill = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(fill);

  return (
    <div
      className={`csv-fill-progress csv-fill-progress--${variant}${indeterminate ? " is-indeterminate" : ""}`}
      role="progressbar"
      aria-valuemin={showPercent ? 0 : undefined}
      aria-valuemax={showPercent ? 100 : undefined}
      aria-valuenow={showPercent && !indeterminate ? rounded : undefined}
      aria-busy={indeterminate || undefined}
    >
      <MaskFillLogo
        percent={fill}
        variant={variant}
        indeterminate={indeterminate}
      />
      {showPercent && !indeterminate ? (
        <>
          <p className="csv-fill-progress__pct">{rounded}%</p>
          <ScaleBar fill={fill} variant={variant} />
        </>
      ) : null}
    </div>
  );
}
