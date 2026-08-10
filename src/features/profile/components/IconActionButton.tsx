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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M5 7h14M10 7V5h4v2M8.5 7l.7 12h5.6l.7-12" />
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
