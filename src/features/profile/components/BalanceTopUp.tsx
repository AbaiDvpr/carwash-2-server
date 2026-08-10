"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { topUpBalance, type TopUpMethod } from "@/lib/api/payments";
import { useT } from "@/hooks/useT";
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

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`theme-radio inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2${
        checked ? " is-on" : ""
      }`}
      aria-hidden
    >
      {checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

export default function BalanceTopUp({
  balance,
  loading,
  onSuccess,
}: BalanceTopUpProps) {
  const t = useT();
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
      setError(t("payment.min_amount", "Минимальная сумма — 100 ₸"));
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
    <div className="space-y-3">
      <section className="profile-card">
        <div className="profile-card__balance">
          <div className="profile-card__balance-item">
            <p className="profile-card__balance-label">
              {t("payment.current_balance", "Текущий баланс")}
            </p>
            <p className="profile-card__balance-value">
              {loading && balance == null ? "…" : formatBalance(balance ?? 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="profile-card">
        <p className="px-4 pt-3 text-[0.8125rem] font-medium uppercase tracking-wider text-[var(--app-description)]">
          {t("payment.method", "Способ оплаты")}
        </p>
        <div role="radiogroup" aria-label={t("payment.method", "Способ оплаты")}>
          {METHODS.map((item, index) => {
            const active = method === item.id;
            return (
              <div key={item.id}>
                {index > 0 ? (
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                ) : null}
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={saving}
                  onClick={() => {
                    setMethod(item.id);
                    setMessage(null);
                    setError(null);
                  }}
                  className="profile-nav-row theme-hover disabled:opacity-60"
                >
                  <RadioMark checked={active} />
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__label">{item.label}</span>
                    <span className="profile-nav-row__hint theme-description">
                      {item.hint}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="profile-card">
        <div className="space-y-3 px-4 py-3">
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium uppercase tracking-wider text-[var(--app-description)]">
              {t("payment.amount", "Сумма пополнения")}
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
              className="theme-field w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
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
                    ? "theme-chip-active"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                ].join(" ")}
              >
                {formatBalance(value)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <p className="px-1 text-center text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="px-1 text-center text-xs text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="theme-button w-full rounded-xl px-4 py-3 text-sm"
      >
        {saving
          ? t("payment.topping_up", "Пополняем…")
          : `${t("profile.top_up", "Пополнить")} · ${methodLabel}`}
      </button>

      <p className="theme-description px-1 text-center text-[0.8125rem]">
        {t("payment.min_note", "Минимум 100 ₸")}
      </p>
    </div>
  );
}
