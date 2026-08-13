"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
      />
      <path strokeLinecap="round" d="m13.5 6.5 3 3" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6A1.2 1.2 0 0 1 14.5 5.2V7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 7l1 12.2A1.8 1.8 0 0 0 9.3 21h5.4a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
      <path strokeLinecap="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path strokeLinecap="round" d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

type IconActionButtonProps = {
  label: string;
  danger?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

/** Иконка-действие в строках списков (изменить / удалить). */
export default function IconActionButton({
  label,
  danger,
  children,
  type = "button",
  ...rest
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      className={`profile-icon-btn${danger ? " profile-icon-btn--danger" : ""}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
