"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { topUpBalance, type TopUpMethod } from "@/lib/api/payments";
import { useT } from "@/hooks/useT";
import { formatBalance } from "../hooks/useUserBalance";

const PRESETS = [1000, 2000, 5000, 10000];

const METHODS: { id: TopUpMethod; label: string }[] = [
  { id: "kaspi", label: "Kaspi Bank" },
  { id: "forte", label: "Forte Bank" },
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
      className={[
        "theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked ? "is-on" : "",
      ].join(" ")}
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
        `Зачислено ${formatBalance(parsed)}. Баланс: ${formatBalance(result.balance)}`,
      );
      onSuccess?.();
    } catch (err) {
      setError(topUpErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-topup space-y-4">
      <section className="profile-card">
        <div className="profile-card__balance">
          <div className="profile-card__balance-item">
            <p className="profile-card__balance-label">
              {t("home.balance", "Баланс")}
            </p>
            <p className="profile-card__balance-value">
              {loading && balance == null ? "…" : formatBalance(balance ?? 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="profile-card" role="radiogroup" aria-label={t("payment.method", "Способ оплаты")}>
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
              className="profile-nav-row theme-hover text-left disabled:opacity-60"
            >
              <RadioMark checked={active} />
              <span className="profile-nav-row__main">
                <span className="profile-nav-row__hint">{item.label}</span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="profile-card">
        <div className="profile-edit-fields">
          <label className="profile-edit-row">
            <span className="profile-nav-row__label">
              {t("payment.amount", "Сумма")}
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
              className="profile-edit-row__value"
            />
            <div className="profile-topup__presets">
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
                    "profile-topup__preset",
                    parsed === value ? "is-active" : "",
                  ].join(" ")}
                >
                  {formatBalance(value)}
                </button>
              ))}
            </div>
          </label>
        </div>
      </section>

      {error ? <p className="profile-edit__feedback is-error">{error}</p> : null}
      {message ? <p className="profile-edit__feedback is-ok">{message}</p> : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="theme-button w-full"
      >
        {saving
          ? t("payment.topping_up", "Пополняем…")
          : t("profile.top_up", "Пополнить")}
      </button>

      <p className="theme-description text-center" style={{ fontSize: "var(--app-text-sm)" }}>
        {t("payment.min_note", "Минимум 100 ₸")}
      </p>
    </div>
  );
}
