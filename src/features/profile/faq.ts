import type { FaqCategory, FaqItem } from "@/lib/api/faq";

export type { FaqCategory, FaqItem };

export const FAQ_TABS = [
  { id: "wash" as const, labelKey: "common.wash", fallback: "Мойка" },
  { id: "ev" as const, labelKey: "common.charging", fallback: "ЭЗС" },
  { id: "other" as const, labelKey: "profile.faq_other", fallback: "Другие" },
];

/** Локальный fallback, если API недоступен. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "payment",
    category: "wash",
    question: "Как оплатить мойку?",
    answer:
      "Выберите мойку на карте, откройте оплату, выберите тариф и подтвердите платёж.",
  },
  {
    id: "refund",
    category: "wash",
    question: "Можно ли вернуть деньги?",
    answer: "Если услуга не оказана — напишите в поддержку, разберём в течение 24 часов.",
  },
  {
    id: "ev-start",
    category: "ev",
    question: "Как начать зарядку?",
    answer:
      "Выберите ЭЗС на карте, откройте станцию, выберите коннектор и подтвердите старт зарядки.",
  },
  {
    id: "ev-tariff",
    category: "ev",
    question: "Где посмотреть тариф на станции?",
    answer: "Тарифы указаны в карточке станции и в окне оплаты перед стартом сессии.",
  },
  {
    id: "promo",
    category: "other",
    question: "Как использовать промокод?",
    answer: "Введите код в разделе «Промокод». Скидка учтётся при следующей оплате.",
  },
  {
    id: "referral",
    category: "other",
    question: "Как работает рефералка?",
    answer: "Поделитесь кодом. После первой оплаты друга вам на баланс зачислится 100 ₸.",
  },
];
