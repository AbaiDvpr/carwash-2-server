"use client";

type ProfileNavRowProps = {
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
};

export default function ProfileNavRow({
  label,
  hint,
  onClick,
  href,
  external,
  danger,
}: ProfileNavRowProps) {
  const className = [
    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition",
    "hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900/60 dark:active:bg-zinc-900",
    danger ? "text-red-600 dark:text-red-400" : "text-zinc-800 dark:text-zinc-100",
  ].join(" ");

  const content = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-zinc-400">{hint}</span> : null}
      </span>
      {!danger ? (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-zinc-300"
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
