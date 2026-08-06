"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/hooks/useT";

const backClassName =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium theme-accent-text transition hover:bg-[var(--app-hover)]";

const backIconOnlyClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text)] transition hover:bg-[var(--app-hover)]";

function BackIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6 9 12l6 6" />
    </svg>
  );
}

type BackButtonProps = {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  /** Только стрелка, без текста «Назад» */
  iconOnly?: boolean;
};

/** Единая кнопка назад: SVG-стрелка (+ «Назад» по умолчанию) */
export default function BackButton({
  onClick,
  href,
  disabled,
  className,
  children,
  iconOnly = false,
}: BackButtonProps) {
  const t = useT();
  const label = children ?? t("common.back", "Назад");
  const classes = [
    iconOnly ? backIconOnlyClassName : backClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = iconOnly ? (
    <BackIcon className="h-5 w-5" />
  ) : (
    <>
      <BackIcon />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={String(label)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${classes} disabled:cursor-not-allowed disabled:opacity-40`}
      aria-label={String(label)}
    >
      {content}
    </button>
  );
}
