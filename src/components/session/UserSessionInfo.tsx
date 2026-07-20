"use client";

import { useAuthUser } from "@/hooks/useAuthUser";

type UserSessionInfoProps = {
  compact?: boolean;
  className?: string;
};

export default function UserSessionInfo({ compact = false, className = "" }: UserSessionInfoProps) {
  const { name, mounted } = useAuthUser();

  if (!mounted || !name) {
    return null;
  }

  if (compact) {
    return (
      <div className={`text-right text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        <p className="font-medium text-zinc-700 dark:text-zinc-200">{name}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50 ${className}`}
    >
      <p className="text-zinc-900 dark:text-zinc-50">
        <span className="text-zinc-500 dark:text-zinc-400">Имя: </span>
        {name}
      </p>
    </div>
  );
}
