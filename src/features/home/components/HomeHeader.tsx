"use client";

import { useAuthUser } from "@/hooks/useAuthUser";
import { useAppEnvironment } from "@/hooks/useAppEnvironment";

type HomeHeaderProps = {
  city: string;
};

export default function HomeHeader({ city = "Астана" }: HomeHeaderProps) {
  const { source, mounted: envMounted } = useAppEnvironment();
  const { name, mounted: userMounted } = useAuthUser();

  const mounted = envMounted && userMounted;
  const displayName = mounted ? name || "…" : "…";

  return (
    <header className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 px-4 pb-6 pt-5 text-white dark:border-zinc-800 dark:from-blue-700 dark:via-blue-800 dark:to-zinc-900">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-white/5"
        aria-hidden
      />

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
        Здравствуйте
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{displayName}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-blue-50 backdrop-blur-sm">
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>{city}</span>
        </div>
        {mounted && source ? (
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-50">
            source: {source}
          </span>
        ) : null}
      </div>
    </header>
  );
}
