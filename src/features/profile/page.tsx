"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout";
import UserSessionInfo from "@/components/session/UserSessionInfo";
import { useAuthUser } from "@/hooks/useAuthUser";
import { forceLogout } from "@/lib/forceLogout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleHeaderNav } from "@/store/slices/appSlice";
import GarageSection from "./components/GarageSection";
import ProfileVersion from "./components/ProfileVersion";
import { usePromoCode } from "./hooks/usePromoCode";

const REFERRAL_CODE = "CARWASH-FRIEND";
const REFERRAL_LINK = "https://carwash.app/invite/CARWASH-FRIEND";

const CONTACT_LINKS = {
  telegram: "https://t.me/carwash_support",
  whatsapp: "https://wa.me/77001234567",
};

const FAQ_ITEMS = [
  {
    id: "payment",
    question: "Как оплатить мойку?",
    answer:
      "Выберите мойку на карте, откройте страницу оплаты, выберите тариф и подтвердите платёж в приложении.",
  },
  {
    id: "refund",
    question: "Можно ли вернуть деньги?",
    answer:
      "Возврат возможен, если услуга не была оказана. Напишите нам в Telegram или WhatsApp — поможем в течение 24 часов.",
  },
  {
    id: "promo",
    question: "Как использовать промокод?",
    answer:
      "Введите код в разделе «Промокод» в профиле и нажмите «Применить». Скидка учтётся при следующей оплате.",
  },
  {
    id: "referral",
    question: "Как работает рефералка?",
    answer:
      "Поделитесь ссылкой с другом. После его первой оплаты вы оба получите бонус на счёт в приложении.",
  },
];

export default function ProfilePage() {
  const { name, mounted } = useAuthUser();
  const dispatch = useAppDispatch();
  const appVersion = useAppSelector((state) => state.app.version);
  const showHeaderNav = useAppSelector((state) => state.app.showHeaderNav);
  const { promoCode, promoMessage, applyPromo, updatePromoCode } = usePromoCode();
  const [copied, setCopied] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PageLayout title="Profile" description="Профиль пользователя CarWash">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-10">
        <UserSessionInfo className="mb-4" />
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">
            Профиль
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {mounted ? name || "…" : "…"}
          </h1>
        </div>
        <div className="space-y-8">
          <GarageSection />

          <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/20">
            <p className="text-sm text-blue-100">
              Поделитесь ссылкой — вы и друг получите бонус после первой мойки
            </p>
            <p className="mt-4 font-mono text-2xl font-bold tracking-wide">{REFERRAL_CODE}</p>
            <p className="mt-1 text-xs text-blue-200">Ваш реферальный код</p>
            <button
              type="button"
              onClick={handleCopyReferral}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-blue-700 transition active:scale-[0.98]"
            >
              {copied ? "Ссылка скопирована" : "Пригласить друга"}
            </button>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Промокод</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => updatePromoCode(e.target.value)}
                placeholder="Введите код"
                className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-4 py-3.5 text-sm text-zinc-900 outline-none ring-blue-500 transition focus:bg-white focus:ring-2 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-900"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="shrink-0 rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                OK
              </button>
            </div>
            {promoMessage && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{promoMessage}</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Связаться с нами
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={CONTACT_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3.5 transition active:scale-[0.98] dark:bg-zinc-800/80"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Telegram</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">@carwash_support</p>
                </div>
              </a>
              <a
                href={CONTACT_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3.5 transition active:scale-[0.98] dark:bg-zinc-800/80"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">WhatsApp</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Написать в чат</p>
                </div>
              </a>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">FAQ</h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800/80"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {item.question}
                      </span>
                      <svg
                        className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {isOpen && (
                      <p className="px-4 pb-3.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pt-2">
            <button
              type="button"
              onClick={() => {
                forceLogout();
              }}
              className="flex w-full items-center justify-center rounded-xl bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 transition active:scale-[0.98] dark:bg-red-950/30 dark:text-red-400"
            >
              Выйти
            </button>
          </section>

          <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Redux тест</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Переключатель меняет состояние в store и сразу влияет на header.
            </p>
            <button
              type="button"
              onClick={() => dispatch(toggleHeaderNav())}
              className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
            >
              {showHeaderNav ? "Скрыть навигацию в header" : "Показать навигацию в header"}
            </button>
          </section>
        </div>

        <ProfileVersion version={appVersion} />
      </div>
    </PageLayout>
  );
}
