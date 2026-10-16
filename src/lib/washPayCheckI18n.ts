import type { AppLocale } from "@/lib/i18n/storage";

type LocaleText = { ru: string; en: string; kk: string };

const ACTIVE_TITLE: LocaleText = {
  ru: "Уже есть активная мойка",
  en: "You already have an active wash",
  kk: "Белсенді жуу бар",
};

const ACTIVE_TEXT: LocaleText = {
  ru: "У вас уже есть оплаченная мойка. Нельзя оплатить повторно — откройте текущую сессию.",
  en: "You already have a paid wash. You can’t pay again — open the current session.",
  kk: "Сізде төленген жуу бар. Қайта төлеуге болмайды — ағымдағы сессияны ашыңыз.",
};

const MUST_EXIT_TITLE: LocaleText = {
  ru: "Сначала выезд из здания",
  en: "Exit the building first",
  kk: "Алдымен ғимараттан шығыңыз",
};

const MUST_EXIT_TEXT: LocaleText = {
  ru: "Чтобы оплатить ещё раз, выйдите из здания через шлагбаум паркинга и заезжайте снова. Выезд с территории не нужен.",
  en: "To pay again, exit the building via the parking barrier and drive back in. You don’t need to leave the site.",
  kk: "Қайта төлеу үшін паркинг шлагбаумы арқылы ғимараттан шығып, қайта кіріңіз. Алаңнан шығудың қажеті жоқ.",
};

const NOT_ON_TITLE: LocaleText = {
  ru: "Вы не на этой площадке",
  en: "You’re not at this site",
  kk: "Сіз бұл алаңда емессіз",
};

const NOT_ON_TEXT: LocaleText = {
  ru: "Вы не на этой площадке. Приедьте сюда — только тогда можно оплатить мойку.",
  en: "You’re not at this site. Drive here first — only then you can pay for a wash.",
  kk: "Сіз бұл алаңда емессіз. Алдымен осында келіңіз — содан кейін ғана жууды төлей аласыз.",
};

const NO_CAR_TITLE: LocaleText = {
  ru: "Нет машины в гараже",
  en: "No car in garage",
  kk: "Гаражда көлік жоқ",
};

const NO_CAR_TEXT: LocaleText = {
  ru: "Добавьте машину в гараж — без номера мы не увидим вас на площадке.",
  en: "Add a car to your garage — without a plate we can’t see you on site.",
  kk: "Гаражға көлік қосыңыз — нөмірсіз біз сізді алаңда көре алмаймыз.",
};

const SPEND_LIMIT_TITLE: LocaleText = {
  ru: "Лимит на месяц",
  en: "Monthly wash limit",
  kk: "Айлық лимит",
};

const SPEND_LIMIT_TEXT: LocaleText = {
  ru: "Лимит компании на мойку этой машины в календарном месяце не покрывает сумму.",
  en: "The company’s monthly wash limit for this car doesn’t cover the amount.",
  kk: "Компанияның осы көлікке арналған айлық жуу лимиті соманы жаппайды.",
};

const PARTNER_INSUFFICIENT_TITLE: LocaleText = {
  ru: "Недостаточно средств",
  en: "Not enough funds",
  kk: "Қаражат жеткіліксіз",
};

const PARTNER_INSUFFICIENT_TEXT: LocaleText = {
  ru: "Недостаточно средств на балансе партнёра.",
  en: "Not enough funds on the partner balance.",
  kk: "Серіктес балансында қаражат жеткіліксіз.",
};

const PAY_OUT_OF_SPEND: LocaleText = {
  ru: "Больше остатка на этот месяц",
  en: "More than this month’s remaining limit",
  kk: "Осы айдың қалдығынан көп",
};

const PAY_PARTNER: LocaleText = {
  ru: "Баланс партнёра",
  en: "Partner balance",
  kk: "Серіктес балансы",
};

const PAY_INDIVIDUAL: LocaleText = {
  ru: "Физ лицо",
  en: "Individual",
  kk: "Жеке тұлға",
};

const PAY_COMPANY: LocaleText = {
  ru: "Компания",
  en: "Company",
  kk: "Компания",
};

const PAY_AS: LocaleText = {
  ru: "Оплата",
  en: "Payment",
  kk: "Төлем",
};

const PAY_NO_TARIFF: LocaleText = {
  ru: "Лимит компании на мойку в этом месяце не покрывает тарифы",
  en: "The company’s wash limit this month doesn’t cover the tariffs",
  kk: "Компанияның осы айдағы жуу лимиті тарифтерді жаппайды",
};

const PAY_NO_MONTH: LocaleText = {
  ru: "Компания не задала лимит на мойку за месяц",
  en: "The company hasn’t set a monthly wash limit",
  kk: "Компания айлық жуу лимитін қоймаған",
};

const PAY_PICK_BALANCE: LocaleText = {
  ru: "Выберите баланс",
  en: "Choose a balance",
  kk: "Балансты таңдаңыз",
};

const PAY_WHICH_BALANCE: LocaleText = {
  ru: "Какой баланс списать",
  en: "Which balance to charge",
  kk: "Қай баланстан шегеру",
};

const PAY_NOT_CHOSEN: LocaleText = {
  ru: "Не выбрано",
  en: "Not selected",
  kk: "Таңдалмаған",
};

const PAY_SELF: LocaleText = {
  ru: "Свой баланс",
  en: "My balance",
  kk: "Өз балансым",
};

const PAY_AVAILABLE: LocaleText = {
  ru: "Доступно",
  en: "Available",
  kk: "Қолжетімді",
};

const PAY_NOT_AVAILABLE: LocaleText = {
  ru: "Недоступно",
  en: "Unavailable",
  kk: "Қолжетімсіз",
};

const THIS_CAR: LocaleText = {
  ru: "эту машину",
  en: "this car",
  kk: "осы көлік",
};

const MONTH_FOR_CAR: LocaleText = {
  ru: "На {plate} за этот месяц",
  en: "For {plate} this month",
  kk: "{plate} · осы ай",
};

const MONTH_LEFT_AMOUNT: LocaleText = {
  ru: "Осталось {left}",
  en: "{left} left",
  kk: "Қалды {left}",
};

const MONTH_LIMIT_USED: LocaleText = {
  ru: "Лимит {limit} · потрачено {used}",
  en: "Limit {limit} · spent {used}",
  kk: "Лимит {limit} · жұмсалғаны {used}",
};

const PAY_PHRASES = {
  out_of_spend: { key: "payment.out_of_spend", texts: PAY_OUT_OF_SPEND },
  pay_partner: { key: "payment.pay_partner", texts: PAY_PARTNER },
  pay_individual: { key: "payment.pay_individual", texts: PAY_INDIVIDUAL },
  pay_company: { key: "payment.pay_company", texts: PAY_COMPANY },
  pay_as: { key: "payment.pay_as", texts: PAY_AS },
  no_tariff_in_limit: { key: "payment.no_tariff_in_limit", texts: PAY_NO_TARIFF },
  no_month_limit: { key: "payment.no_month_limit", texts: PAY_NO_MONTH },
  pick_balance: { key: "payment.pick_balance", texts: PAY_PICK_BALANCE },
  which_balance: { key: "payment.which_balance", texts: PAY_WHICH_BALANCE },
  not_chosen: { key: "payment.not_chosen", texts: PAY_NOT_CHOSEN },
  pay_self: { key: "payment.pay_self", texts: PAY_SELF },
  available: { key: "payment.available", texts: PAY_AVAILABLE },
  not_available: { key: "payment.not_available", texts: PAY_NOT_AVAILABLE },
} as const;

export type PayPhraseId = keyof typeof PAY_PHRASES;

/** Подпись оплаты: из каталога, если там есть нужный язык, иначе локальный перевод. */
export function payPhrase(
  t: (key: string, fallback?: string) => string,
  id: PayPhraseId,
  locale: AppLocale = "ru",
): string {
  const phrase = PAY_PHRASES[id];
  return localized(t, phrase.key, phrase.texts, locale);
}

function tenge(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

/** Остаток лимита компании на конкретную машину за календарный месяц. */
export function monthSpendCopy(
  t: (key: string, fallback?: string) => string,
  locale: AppLocale,
  parts: { plate?: string | null; left: number; limit: number; used: number },
): { title: string; left: string; meta: string } {
  const plate = parts.plate?.trim()
    ? parts.plate.trim()
    : localized(t, "payment.this_car", THIS_CAR, locale);

  return {
    title: localized(t, "payment.month_for_car", MONTH_FOR_CAR, locale).replace(
      "{plate}",
      plate,
    ),
    left: localized(t, "payment.month_left_amount", MONTH_LEFT_AMOUNT, locale).replace(
      "{left}",
      tenge(parts.left),
    ),
    meta: localized(t, "payment.month_limit_used", MONTH_LIMIT_USED, locale)
      .replace("{limit}", tenge(parts.limit))
      .replace("{used}", tenge(parts.used)),
  };
}

export function partnerBalanceLabel(
  t: (key: string, fallback?: string) => string,
  locale: AppLocale,
  name?: string | null,
): string {
  const base = payPhrase(t, "pay_partner", locale);
  const title = name?.trim();
  return title ? `${base} · ${title}` : base;
}

function pick(text: LocaleText, locale: AppLocale): string {
  if (locale === "en") return text.en;
  if (locale === "kz") return text.kk;
  return text.ru;
}

/**
 * Берём строку из каталога только если она реально на нужном языке.
 * Иначе translate() для en/kz часто падает в entry.ru — показываем локальный fallback.
 */
function localized(
  t: (key: string, fallback?: string) => string,
  key: string,
  texts: LocaleText,
  locale: AppLocale,
): string {
  const fallback = pick(texts, locale);
  const value = t(key, fallback);
  if (!value || value === key) return fallback;
  if (locale !== "ru" && value === texts.ru) return fallback;
  return value;
}

/** Сообщения проверки оплаты мойки (по code с API). */
export function washPayCheckMessage(
  t: (key: string, fallback?: string) => string,
  code: string | null | undefined,
  locale: AppLocale = "ru",
): string {
  switch (code) {
    case "active_wash":
      return localized(t, "wash.active_text", ACTIVE_TEXT, locale);
    case "must_exit_building":
      return localized(t, "wash.must_exit_building", MUST_EXIT_TEXT, locale);
    case "no_car":
      return localized(t, "wash.no_car_text", NO_CAR_TEXT, locale);
    case "spend_limit":
      return localized(t, "wash.spend_limit_text", SPEND_LIMIT_TEXT, locale);
    case "partner_insufficient":
      return localized(
        t,
        "wash.partner_insufficient_text",
        PARTNER_INSUFFICIENT_TEXT,
        locale,
      );
    case "not_on_territory":
    default:
      return localized(t, "wash.not_on_territory", NOT_ON_TEXT, locale);
  }
}

export function washPayCheckTitle(
  t: (key: string, fallback?: string) => string,
  code: string | null | undefined,
  locale: AppLocale = "ru",
): string {
  switch (code) {
    case "active_wash":
      return localized(t, "wash.active_title", ACTIVE_TITLE, locale);
    case "must_exit_building":
      return localized(t, "wash.must_exit_building_title", MUST_EXIT_TITLE, locale);
    case "no_car":
      return localized(t, "wash.no_car_title", NO_CAR_TITLE, locale);
    case "spend_limit":
      return localized(t, "wash.spend_limit_title", SPEND_LIMIT_TITLE, locale);
    case "partner_insufficient":
      return localized(
        t,
        "wash.partner_insufficient_title",
        PARTNER_INSUFFICIENT_TITLE,
        locale,
      );
    case "not_on_territory":
    default:
      return localized(t, "wash.not_on_territory_title", NOT_ON_TITLE, locale);
  }
}

/** Угадать code по тексту/полям ответа API (чтобы не показывать сырой RU с бэка). */
export function washPayCheckCodeFromApi(body: {
  code?: string | null;
  message?: string | null;
  errors?: Record<string, string[]> | null;
} | null): string | null {
  if (body?.code) return body.code;
  if (body?.errors?.presence?.[0]) return "not_on_territory";
  if (body?.errors?.session?.[0]) return "active_wash";
  if (body?.errors?.car_id?.[0]) return "no_car";
  if (body?.errors?.amount?.[0] && /лимит|limit|min|max/i.test(body.errors.amount[0])) {
    return "spend_limit";
  }
  if (
    body?.errors?.amount?.[0] &&
    /балансе партн|partner balance|серіктес баланс/i.test(body.errors.amount[0])
  ) {
    return "partner_insufficient";
  }

  const msg = `${body?.message ?? ""} ${Object.values(body?.errors ?? {})
    .flat()
    .join(" ")}`;
  if (/активн|повторн|оплаченн.*мойк|already have.*wash|paid wash/i.test(msg)) {
    return "active_wash";
  }
  if (/выезд из здания|паркинг|exit the building|ғимараттан/i.test(msg)) {
    return "must_exit_building";
  }
  if (/гараж|garage|без номера|without a plate/i.test(msg)) {
    return "no_car";
  }
  if (/лимит|spend.?limit|вне лимита/i.test(msg)) {
    return "spend_limit";
  }
  if (/балансе партн|partner balance|серіктес баланс/i.test(msg)) {
    return "partner_insufficient";
  }
  if (/не видим|площадк|not on site|алаңда|Упс!|не на этой/i.test(msg)) {
    return "not_on_territory";
  }
  return null;
}
