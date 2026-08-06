export type FaqCategory = "wash" | "ev" | "other";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
};

export const FAQ_TABS = [
  { id: "wash", label: "Мойка" },
  { id: "ev", label: "ЭЗС" },
  { id: "other", label: "Другие" },
] as const;

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
    answer: "Поделитесь ссылкой. После первой оплаты друга оба получите бонус.",
  },
];
