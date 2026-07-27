"use client";

import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import HistoryList from "./components/HistoryList";

export default function HistoryPage() {
  const t = useT();

  return (
    <PageLayout title={t("history.title", "История")} description={t("history.title", "История")}>
      <div className="mb-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {t("history.title", "История")}
        </p>
        <h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("history.title", "История")}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {t("history.start", "Начало")} · {t("history.end", "Конец")} · {t("history.min", "мин")}
        </p>
      </div>

      <HistoryList />
    </PageLayout>
  );
}
