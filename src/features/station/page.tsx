"use client";

import Link from "next/link";
import { useStation } from "@/hooks/useStation";
import StationDetail from "./components/StationDetail";

type StationPageProps = {
  id: string;
};

export default function StationPage({ id }: StationPageProps) {
  const { station, loading, error, notFound } = useStation(id);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-36 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-2 h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Точка не найдена</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Такой мойки или ЭЗС нет в списке.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Не удалось загрузить</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {error || "Проверьте авторизацию и попробуйте снова."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  return <StationDetail station={station} />;
}
