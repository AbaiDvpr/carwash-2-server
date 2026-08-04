"use client";

import type { ReactNode } from "react";

type ProfileNavRowProps = {
  label: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
};

export default function ProfileNavRow({
  label,
  hint,
  icon,
  trailing,
  onClick,
  href,
  external,
  danger,
}: ProfileNavRowProps) {
  const className = `profile-nav-row theme-hover${danger ? " is-danger" : ""}`;

  const content = (
    <>
      {icon ? (
        <span className="profile-nav-row__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="profile-nav-row__main">
        <span className="profile-nav-row__label">{label}</span>
        {hint ? (
          <span className="profile-nav-row__hint theme-description">{hint}</span>
        ) : null}
      </span>
      {trailing ? (
        <span className="profile-nav-row__trailing">{trailing}</span>
      ) : !danger ? (
        <svg
          className="profile-nav-row__chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" d="m9 6 6 6-6 6" />
        </svg>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
