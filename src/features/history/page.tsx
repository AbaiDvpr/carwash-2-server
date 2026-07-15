"use client";

import { PageLayout } from "@/components/layout";
import UserSessionInfo from "@/components/session/UserSessionInfo";
import HistoryList from "./components/HistoryList";

export default function HistoryPage() {
  return (
    <PageLayout title="История" description="История моек">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-10">
        <UserSessionInfo className="mb-4" />

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">
            История
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ваши мойки
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Когда зашли, когда вышли и сколько минут мыли
          </p>
        </div>

        <HistoryList />
      </div>
    </PageLayout>
  );
}
