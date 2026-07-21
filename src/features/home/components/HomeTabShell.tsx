"use client";

import type { ReactNode } from "react";

type HomeTabShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: ReactNode;
  children: ReactNode;
  /** Карта: заполняет высоту, без скролла страницы */
  fill?: boolean;
};

/** Шапка списка/карты. Паддинги страницы — в PageLayout (.page-content). */
export default function HomeTabShell({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  fill = false,
}: HomeTabShellProps) {
  const header = (
    <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="theme-description text-[11px] font-medium uppercase tracking-wider">
          {eyebrow}
        </p>
        <h1
          className="mt-0.5 text-base font-semibold tracking-tight"
          style={{ color: "var(--app-text)" }}
        >
          {title}
        </h1>
        <p className="theme-description mt-0.5 text-xs">{subtitle}</p>
      </div>
      {action}
    </div>
  );

  if (fill) {
    return (
      <div className="map-page">
        <div className="map-page__header">{header}</div>
        <div className="map-page__body">{children}</div>
      </div>
    );
  }

  return (
    <>
      {header}
      {children}
    </>
  );
}
