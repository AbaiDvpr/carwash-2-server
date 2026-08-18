"use client";

import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import HistoryList from "./components/HistoryList";

export default function HistoryPage() {
  const t = useT();
  const router = useRouter();

  return (
    <PageLayout title={t("history.title", "История")} className="page--profile-edit">
      <HistoryList
        title={t("history.title", "История")}
        onBack={() => router.push("/profile")}
      />
    </PageLayout>
  );
}
