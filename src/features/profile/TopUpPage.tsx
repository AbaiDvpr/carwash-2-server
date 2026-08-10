"use client";

import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import BalanceTopUp from "./components/BalanceTopUp";
import { useUserBalance } from "./hooks/useUserBalance";
import "./components/profile.css";

export default function TopUpPage() {
  const t = useT();
  const { balance, loading, refresh } = useUserBalance();

  return (
    <PageLayout title={t("profile.top_up", "Пополнение баланса")}>
      <div className="mb-3">
        <BackButton iconOnly href="/profile" />
      </div>
      <BalanceTopUp
        balance={balance}
        loading={loading}
        onSuccess={() => void refresh()}
      />
    </PageLayout>
  );
}
