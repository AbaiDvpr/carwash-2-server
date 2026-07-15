"use client";

import Link from "next/link";
import { useCwStation } from "@/hooks/useCwStation";
import StationDetail from "./components/StationDetail";

type StationPageProps = {
  id: string;
};

export default function StationPage({ id }: StationPageProps) {
  const { station, loading, error, notFound } = useCwStation(id);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-10">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Мойка не найдена</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Такой автомойки нет в списке.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Не удалось загрузить</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {error || "Проверьте авторизацию и попробуйте снова."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  return <StationDetail station={station} />;
}
