"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import type { Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { parseEvStationId } from "@/lib/api/ev";
import { payCarWash, payEv, payFromBalance } from "@/lib/api/payments";
import { navigateNavbar } from "@/lib/navbarController";
import { formatBalance, useUserBalance } from "@/features/profile/hooks/useUserBalance";
import type { ModalStep } from "../hooks/usePaymentModal";

type CarWashPaymentProps = {
  station: Station;
};

function SuccessIcon() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
      <svg
        className="h-9 w-9 text-emerald-600 dark:text-emerald-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" className="opacity-20" fill="currentColor" stroke="none" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5L16 9" />
      </svg>
    </div>
  );
}

function paymentErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const fieldError =
      body?.errors?.amount?.[0] ??
      body?.errors?.tariff_id?.[0] ??
      body?.errors?.location_id?.[0];
    if (fieldError) return fieldError;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Не удалось оплатить";
}

export default function CarWashPayment({ station }: CarWashPaymentProps) {
  const router = useRouter();
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useUserBalance();
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("confirm");
  const [payError, setPayError] = useState<string | null>(null);

  const selected = station.tariff.find((tariff) => {
    const key = tariff.id != null ? String(tariff.id) : tariff.title;
    return key === selectedTariffKey;
  });
  const balanceValue = balance ?? 0;
  const canAfford =
    selected != null && Number.isFinite(balanceValue) && balanceValue >= selected.price;

  const closeModal = () => {
    if (modalStep === "processing") return;
    setShowConfirm(false);
    setModalStep("confirm");
    setPayError(null);
  };

  const handlePayClick = () => {
    if (!selected) return;
    setPayError(null);
    setModalStep("confirm");
    setShowConfirm(true);
  };

  const handleConfirmPay = async () => {
    if (!selected) return;
    setPayError(null);
    setModalStep("processing");

    try {
      const description = `${station.paymentTitle} · ${selected.title}`;
      const evId = parseEvStationId(station.id);
      const cwId = /^\d+$/.test(station.id) ? Number.parseInt(station.id, 10) : null;

      if (evId != null && selected.id != null) {
        await payEv({
          location_id: evId,
          tariff_id: selected.id,
          description,
        });
      } else if (cwId != null && Number.isFinite(cwId) && selected.id != null) {
        await payCarWash({
          location_id: cwId,
          tariff_id: selected.id,
          description,
        });
      } else {
        // Старые slug (Sauran и т.п.) — только баланс, под гео
        await payFromBalance({
          amount: selected.price,
          tariff_title: selected.title,
          description,
        });
      }

      await refreshBalance();
      setModalStep("success");
    } catch (err) {
      setModalStep("confirm");
      setPayError(paymentErrorMessage(err));
    }
  };

  const isModalLocked = modalStep === "processing" || modalStep === "success";

  const handleBack = () => {
    if (isModalLocked) return;
    navigateNavbar("map", router);
  };

  useEffect(() => {
    if (modalStep !== "success") return;

    const timer = window.setTimeout(() => {
      navigateNavbar("map");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [modalStep]);

  useEffect(() => {
    if (!showConfirm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && modalStep === "confirm") {
        closeModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showConfirm, modalStep]);

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 pt-[max(0.25rem,env(safe-area-inset-top))]">
          <BackButton onClick={handleBack} disabled={isModalLocked} />
        </div>
      </header>

      <section
        className={`page-content ${isModalLocked ? "pointer-events-none select-none opacity-60" : ""}`}
        aria-hidden={isModalLocked}
      >
        <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
            <p className="text-[11px] font-medium text-zinc-400">Оплата</p>
            <h1 className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
              {station.paymentTitle}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">{station.address}</p>
          </div>

          <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Баланс
                </p>
                <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {balanceLoading && balance == null ? "…" : formatBalance(balanceValue)}
                </p>
              </div>
              <p className="text-[11px] text-zinc-400">Списание с баланса</p>
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              {station.kind === "charging" ? "Оплата зарядки" : "Оплата мойки"}
            </p>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              Выберите тариф — сумма спишется с вашего баланса.
            </p>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Тарифы
            </p>
            <div className="space-y-1.5">
              {station.tariff.map((tariff) => {
                const key = tariff.id != null ? String(tariff.id) : tariff.title;
                const isSelected = selectedTariffKey === key;

                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="tariff"
                      checked={isSelected}
                      disabled={isModalLocked}
                      onChange={() => {
                        if (isModalLocked) return;
                        setSelectedTariffKey(isSelected ? null : key);
                        closeModal();
                      }}
                      className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                        {tariff.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {tariff.description}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-zinc-900 dark:text-zinc-50">
                      {tariff.price} ₸
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            {selected ? (
              <div className="mb-2 space-y-1 text-center text-xs">
                <p className="text-zinc-600 dark:text-zinc-300">
                  Выбрано:{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {selected.title}
                  </span>
                  {" · "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {selected.price} ₸
                  </span>
                </p>
                {!canAfford && !balanceLoading ? (
                  <p className="text-red-600 dark:text-red-400">
                    Недостаточно средств. Нужно {selected.price} ₸, на балансе{" "}
                    {formatBalance(balanceValue)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mb-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Выберите тариф для оплаты
              </p>
            )}
            <button
              type="button"
              disabled={!selected || !canAfford || isModalLocked || balanceLoading}
              onClick={handlePayClick}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {station.kind === "charging" ? "Оплатить зарядку" : "Оплатить мойку"}
            </button>
          </div>
        </article>
      </section>

      {showConfirm && selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => {
            if (modalStep === "confirm") {
              closeModal();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            {modalStep === "confirm" ? (
              <>
                <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                  <p
                    id="payment-modal-title"
                    className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-50"
                  >
                    Вы точно уверены?
                  </p>
                  <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Сумма спишется с баланса
                  </p>
                </div>

                <div className="space-y-3 px-5 py-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400">Мойка</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {station.paymentTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400">Тариф</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {selected.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400">Баланс</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatBalance(balanceValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">К оплате</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {selected.price} ₸
                    </span>
                  </div>
                  {payError ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                      {payError}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmPay()}
                    className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Да, оплатить
                  </button>
                </div>
              </>
            ) : null}

            {modalStep === "processing" ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
                <p className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Оплата...
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Списываем с баланса
                </p>
              </div>
            ) : null}

            {modalStep === "success" ? (
              <div className="px-5 py-8 text-center">
                <SuccessIcon />
                <p className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Оплата прошла успешно
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  С баланса списано {selected.price} ₸
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Остаток: {formatBalance(balanceValue)}
                </p>
                {/^\d+$/.test(station.id) || parseEvStationId(station.id) != null ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Запись добавлена в историю
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
