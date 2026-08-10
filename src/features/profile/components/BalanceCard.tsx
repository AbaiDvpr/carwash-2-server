"use client";

import { useT } from "@/hooks/useT";
import { formatBalance } from "../hooks/useUserBalance";

type BalanceCardProps = {
  balance: number | null;
  loading: boolean;
  onTopUp: () => void;
  onHistory: () => void;
};

export default function BalanceCard({
  balance,
  loading,
  onTopUp,
  onHistory,
}: BalanceCardProps) {
  const t = useT();

  return (
    <section>
      <p className="theme-description mb-1.5 px-0.5 text-[0.8125rem] font-medium uppercase tracking-wider">
        {t("home.balance", "Баланс")}
      </p>
      <div className="app-section">
        <div className="app-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <p className="theme-description text-[0.8125rem]">
            {t("profile.available", "Доступно")}
          </p>
          <p
            className="mt-0.5 text-2xl font-semibold tracking-tight"
            style={{ color: "var(--app-text)" }}
          >
            {loading && balance == null ? "…" : formatBalance(balance ?? 0)}
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-px"
          style={{
            borderTop: "1px solid var(--app-border)",
            background: "var(--app-border)",
          }}
        >
          <button
            type="button"
            onClick={onTopUp}
            className="app-row"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              background: "var(--app-block)",
            }}
          >
            <span className="block text-sm font-medium" style={{ color: "var(--app-text)" }}>
              {t("profile.top_up", "Пополнить")}
            </span>
            <span className="theme-description mt-0.5 block text-[0.8125rem]">Карта / Kaspi</span>
          </button>
          <button
            type="button"
            onClick={onHistory}
            className="app-row"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              background: "var(--app-block)",
            }}
          >
            <span className="block text-sm font-medium" style={{ color: "var(--app-text)" }}>
              {t("common.nav_history", "История")}
            </span>
            <span className="theme-description mt-0.5 block text-[0.8125rem]">Мойки и оплаты</span>
          </button>
        </div>
      </div>
    </section>
  );
}
