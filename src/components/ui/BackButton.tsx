"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const backClassName =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40";

function BackIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
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
};

/** Единая кнопка назад: SVG-стрелка + «Назад» */
export default function BackButton({
  onClick,
  href,
  disabled,
  className,
  children = "Назад",
}: BackButtonProps) {
  const classes = [backClassName, className].filter(Boolean).join(" ");

  const content = (
    <>
      <BackIcon />
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Назад">
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
      aria-label="Назад"
    >
      {content}
    </button>
  );
}
