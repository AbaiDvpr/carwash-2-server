"use client";

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
  return (
    <section>
      <p className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Баланс
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-3 py-3">
          <p className="text-[11px] text-zinc-400">Доступно</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {loading && balance == null ? "…" : formatBalance(balance ?? 0)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
          <button
            type="button"
            onClick={onTopUp}
            className="bg-white px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
          >
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Пополнить
            </span>
            <span className="mt-0.5 block text-[11px] text-zinc-400">Карта / Kaspi</span>
          </button>
          <button
            type="button"
            onClick={onHistory}
            className="bg-white px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
          >
            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
              История
            </span>
            <span className="mt-0.5 block text-[11px] text-zinc-400">Мойки и оплаты</span>
          </button>
        </div>
      </div>
    </section>
  );
}
