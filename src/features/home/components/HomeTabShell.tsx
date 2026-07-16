"use client";

import type { ReactNode } from "react";

type HomeTabShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: ReactNode;
  children: ReactNode;
};

/** Шапка списка/карты. Паддинги страницы — в PageLayout (.page-content). */
export default function HomeTabShell({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: HomeTabShellProps) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {eyebrow}
          </p>
          <h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  );
}
