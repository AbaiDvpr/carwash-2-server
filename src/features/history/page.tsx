"use client";

import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import HistoryList from "./components/HistoryList";

export default function HistoryPage() {
  const t = useT();

  return (
    <PageLayout title={t("history.title", "История")} className="page--profile-edit">
      <HistoryList title={t("history.title", "История")} />
    </PageLayout>
  );
}
