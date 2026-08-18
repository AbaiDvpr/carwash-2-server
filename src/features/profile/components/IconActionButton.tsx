"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Heroicons outline — trash */
export function IconTrash() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** Карандаш в квадрате — толщина как у IconTrash */
export function IconEdit() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3H6a2.5 2.5 0 0 0-2.5 2.5v12A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5V12" />
      <path d="M17.1 3.6a1.55 1.55 0 0 1 2.2 2.2L10.75 14.35a1.2 1.2 0 0 1-.52.3l-2.55.7a.4.4 0 0 1-.49-.49l.7-2.55a1.2 1.2 0 0 1 .3-.52z" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 4.5 4.5L19 7" />
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
