"use client";

import type { ReactNode } from "react";
import {
  resolveMarkerFaceParts,
  type KindMarkerPrefs,
  type MarkerFacePart,
  type MarkerKind,
} from "@/features/map/markerStyles";

type MarkerFaceContentProps = {
  kind: MarkerKind;
  prefs: KindMarkerPrefs;
  free: number;
  /** @deprecated не используется — на точке только свободные */
  total?: number;
  /** Кастомная иконка (карта / sheet); иначе встроенная svg */
  icon?: ReactNode;
};

function DefaultIcon({ kind }: { kind: MarkerKind }) {
  if (kind === "charging") {
    return (
      <svg viewBox="7 3 10 18" fill="currentColor" className="map-marker__icon-svg">
        <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="map-marker__icon-svg">
      <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
    </svg>
  );
}

function renderPart(
  part: MarkerFacePart,
  key: string,
  opts: {
    kind: MarkerKind;
    free: number;
    icon?: ReactNode;
  },
): ReactNode {
  switch (part) {
    case "icon":
      return (
        <span key={key} className="map-marker__icon" aria-hidden>
          {opts.icon ?? <DefaultIcon kind={opts.kind} />}
        </span>
      );
    case "free":
      return (
        <span key={key} className="map-marker__count-n map-marker__count-n--free">
          {opts.free}
        </span>
      );
    default:
      return null;
  }
}

/** Внутренности маркера: иконка + свободные (без «/» и «всего»). */
export default function MarkerFaceContent({
  kind,
  prefs,
  free,
  icon,
}: MarkerFaceContentProps) {
  const parts = resolveMarkerFaceParts(prefs);
  const digitLen = String(Math.max(0, free)).length;
  const density =
    digitLen >= 6 ? " is-xdense" : digitLen >= 4 ? " is-dense" : "";

  return (
    <div className={`map-marker__count${density}`}>
      {parts.map((part, index) =>
        renderPart(part, `${part}-${index}`, {
          kind,
          free,
          icon,
        }),
      )}
    </div>
  );
}
