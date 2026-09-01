"use client";

import { PRELOADER_SVG_SRC } from "@/features/profile/components/preloaderVariants";

type ServiceFillProgressProps = {
  percent: number;
  variant: "wash" | "charging";
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
}: {
  percent: number;
  variant: "wash" | "charging";
}) {
  const fill = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="csv-fill-progress__mark"
      style={{ ["--csv-fill" as string]: `${fill}%` }}
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

export default function ServiceFillProgress({ percent, variant }: ServiceFillProgressProps) {
  const fill = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(fill);

  return (
    <div
      className={`csv-fill-progress csv-fill-progress--${variant}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
    >
      <MaskFillLogo percent={fill} variant={variant} />
      <p className="csv-fill-progress__pct">{rounded}%</p>
      <ScaleBar fill={fill} variant={variant} />
    </div>
  );
}
