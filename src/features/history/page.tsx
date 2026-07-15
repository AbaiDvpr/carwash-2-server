"use client";

import { PageLayout } from "@/components/layout";
import HistoryList from "./components/HistoryList";

export default function HistoryPage() {
  return (
    <PageLayout title="История" description="История моек">
      <div className="mx-auto w-full max-w-lg px-4 py-4 pb-8">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">История</p>
          <h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ваши мойки
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Вход, выход и длительность
          </p>
        </div>

        <HistoryList />
      </div>
    </PageLayout>
  );
}
