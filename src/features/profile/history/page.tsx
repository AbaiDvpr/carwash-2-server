"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import HistoryList from "./components/HistoryList";

function parseHistoryKind(raw: string | null): "wash" | "charging" | undefined {
  if (raw === "wash" || raw === "charging") return raw;
  return undefined;
}

function HistoryPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = parseHistoryKind(searchParams.get("kind"));

  const title =
    kind === "wash"
      ? t("profile.history_wash", "История моек")
      : kind === "charging"
        ? t("profile.history_charging", "История зарядок")
        : t("history.title", "История");

  return (
    <PageLayout title={title} className="page--profile-edit">
      <HistoryList
        title={title}
        kind={kind}
        onBack={() => router.push("/profile")}
      />
    </PageLayout>
  );
}

export default function HistoryPage() {
  const t = useT();

  return (
    <Suspense
      fallback={
        <PageLayout title={t("history.title", "История")} className="page--profile-edit">
          <div className="history-page">
            <p className="history-card__empty">{t("common.loading", "Загрузка...")}</p>
          </div>
        </PageLayout>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
