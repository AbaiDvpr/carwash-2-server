"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Station } from "@/data/stations";
import { navigateNavbar } from "@/lib/navbarController";
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

export default function CarWashPayment({ station }: CarWashPaymentProps) {
  const router = useRouter();
  const [selectedTariff, setSelectedTariff] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("confirm");

  const selected = station.tariff.find((tariff) => tariff.title === selectedTariff);

  const closeModal = () => {
    setShowConfirm(false);
    setModalStep("confirm");
  };

  const handlePayClick = () => {
    if (!selected) return;
    setModalStep("confirm");
    setShowConfirm(true);
  };

  const handleConfirmPay = () => {
    if (!selected) return;
    setModalStep("processing");
  };

  const isModalLocked = modalStep === "processing" || modalStep === "success";

  const handleBack = () => {
    if (isModalLocked) return;
    navigateNavbar("map", router);
  };

  useEffect(() => {
    if (modalStep !== "processing") return;

    const delay = 2000 + Math.random() * 2000;
    const timer = window.setTimeout(() => {
      setModalStep("success");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [modalStep]);

  useEffect(() => {
    if (modalStep !== "success") return;

    navigateNavbar("map");
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
    <div className="pb-10">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-2xl items-center px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleBack}
            disabled={isModalLocked}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Назад на главную"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
            </svg>
            Назад
          </button>
        </div>
      </header>

      <section
        className={`mx-auto max-w-2xl px-4 pt-6 ${isModalLocked ? "pointer-events-none select-none opacity-60" : ""}`}
        aria-hidden={isModalLocked}
      >
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-8 text-white">
            <p className="text-sm font-medium text-blue-100">Здравствуйте!</p>
            <h1 className="mt-2 text-2xl font-bold leading-snug">
              Это мойка — {station.paymentTitle}
            </h1>
            <p className="mt-2 text-sm text-blue-100">{station.address}</p>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Оплата мойки
            </p>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Выберите один тариф и подтвердите оплату.
            </p>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Тарифы
            </p>
            <div className="space-y-2">
              {station.tariff.map((tariff) => {
                const isSelected = selectedTariff === tariff.title;

                return (
                  <label
                    key={tariff.title}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                        : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="tariff"
                      checked={isSelected}
                      disabled={isModalLocked}
                      onChange={() => {
                        if (isModalLocked) return;
                        setSelectedTariff(isSelected ? null : tariff.title);
                        closeModal();
                      }}
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {tariff.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {tariff.description}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {tariff.price} ₸
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            {selected ? (
              <p className="mb-3 text-center text-sm text-zinc-600 dark:text-zinc-300">
                Выбрано: <span className="font-semibold text-zinc-900 dark:text-zinc-50">{selected.title}</span>
                {" · "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{selected.price} ₸</span>
              </p>
            ) : (
              <p className="mb-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Выберите тариф для оплаты
              </p>
            )}
            <button
              type="button"
              disabled={!selected || isModalLocked}
              onClick={handlePayClick}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Оплатить мойку
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
                    Проверьте данные перед оплатой
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
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">Сумма</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {selected.price} ₸
                    </span>
                  </div>
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
                    onClick={handleConfirmPay}
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
                  Подождите несколько секунд
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
                  Можете заходить на пост
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {station.paymentTitle} · {selected.title}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
