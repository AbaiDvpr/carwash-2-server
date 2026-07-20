"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { topUpBalance, type TopUpMethod } from "@/lib/api/payments";
import { formatBalance } from "../hooks/useUserBalance";

const PRESETS = [1000, 2000, 5000, 10000];

const METHODS: { id: TopUpMethod; label: string; hint: string }[] = [
  { id: "kaspi", label: "Kaspi Bank", hint: "Через Kaspi" },
  { id: "forte", label: "Forte Bank", hint: "Через Forte" },
];

type BalanceTopUpProps = {
  balance: number | null;
  loading: boolean;
  onSuccess?: () => void;
};

function topUpErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const amountError = body?.errors?.amount?.[0];
    if (amountError) return amountError;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Не удалось пополнить баланс";
}

export default function BalanceTopUp({
  balance,
  loading,
  onSuccess,
}: BalanceTopUpProps) {
  const [amount, setAmount] = useState("2000");
  const [method, setMethod] = useState<TopUpMethod>("kaspi");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = Number.parseInt(amount.replace(/\D/g, ""), 10);
  const canSubmit = Number.isFinite(parsed) && parsed >= 100 && !saving;
  const methodLabel =
    METHODS.find((item) => item.id === method)?.label ?? "банк";

  async function handleSubmit() {
    if (!Number.isFinite(parsed) || parsed < 100) {
      setError("Минимальная сумма — 100 ₸");
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await topUpBalance(parsed, method);
      setMessage(
        `Зачислено ${formatBalance(parsed)} через ${methodLabel}. Баланс: ${formatBalance(result.balance)}`,
      );
      onSuccess?.();
    } catch (err) {
      setError(topUpErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-[11px] text-zinc-400">Текущий баланс</p>
        <p className="mt-0.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {loading && balance == null ? "…" : formatBalance(balance ?? 0)}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Способ оплаты
        </p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Банк">
          {METHODS.map((item) => {
            const active = method === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={saving}
                onClick={() => {
                  setMethod(item.id);
                  setMessage(null);
                  setError(null);
                }}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition disabled:opacity-60",
                  active
                    ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                <span
                  className={[
                    "block text-sm font-semibold",
                    active
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-900 dark:text-zinc-50",
                  ].join(" ")}
                >
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Сумма пополнения
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            disabled={saving}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d]/g, ""));
              setMessage(null);
              setError(null);
            }}
            placeholder="2000"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => {
                setAmount(String(value));
                setMessage(null);
                setError(null);
              }}
              className={[
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60",
                parsed === value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
              ].join(" ")}
            >
              {formatBalance(value)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Пополняем…" : `Пополнить через ${methodLabel}`}
      </button>
    </div>
  );
}
