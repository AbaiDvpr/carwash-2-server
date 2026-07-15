"use client";

import { useAppEnvironment } from "@/hooks/useAppEnvironment";

type UserSessionInfoProps = {
  compact?: boolean;
  className?: string;
};

export default function UserSessionInfo({ compact = false, className = "" }: UserSessionInfoProps) {
  const { email, source, isMobileApp, hasNativeBridge, isMobileSource, mounted } = useAppEnvironment();

  if (!mounted) {
    return null;
  }

  if (!email && !source && !isMobileApp) {
    return null;
  }

  if (compact) {
    return (
      <div className={`text-right text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        {email ? <p className="font-medium text-zinc-700 dark:text-zinc-200">{email}</p> : null}
        {source ? <p className="mt-0.5 uppercase tracking-wide">source: {source}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50 ${className}`}
    >
      {email ? (
        <p className="text-zinc-900 dark:text-zinc-50">
          <span className="text-zinc-500 dark:text-zinc-400">email: </span>
          {email}
        </p>
      ) : null}
      {source ? (
        <p className={email ? "mt-1" : ""}>
          <span className="text-zinc-500 dark:text-zinc-400">source: </span>
          <span className="font-medium uppercase text-zinc-900 dark:text-zinc-50">{source}</span>
        </p>
      ) : null}
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        bridge: {hasNativeBridge ? "yes" : "no"} · source mobile: {isMobileSource ? "yes" : "no"} ·{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">
          {isMobileApp ? "мобильное приложение" : "браузер"}
        </span>
      </p>
    </div>
  );
}
