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

const NOT_ON_TITLE: LocaleText = {
  ru: "Машина не на площадке",
  en: "Car not on site",
  kk: "Көлік алаңда жоқ",
};

const NOT_ON_TEXT: LocaleText = {
  ru: "Упс! Мы не видим вашу машину на площадке. Приедьте к нам — только тогда можно оплатить мойку.",
  en: "Oops! We can’t see your car on site. Drive in first — only then you can pay for a wash.",
  kk: "Қап! Біз сіздің көлігіңізді алаңда көрмейміз. Алдымен бізге келіңіз — содан кейін ғана жууды төлей аласыз.",
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
    case "no_car":
      return localized(t, "wash.no_car_text", NO_CAR_TEXT, locale);
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
    case "no_car":
      return localized(t, "wash.no_car_title", NO_CAR_TITLE, locale);
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

  const msg = `${body?.message ?? ""} ${Object.values(body?.errors ?? {})
    .flat()
    .join(" ")}`;
  if (/активн|повторн|оплаченн.*мойк|already have.*wash|paid wash/i.test(msg)) {
    return "active_wash";
  }
  if (/гараж|garage|без номера|without a plate/i.test(msg)) {
    return "no_car";
  }
  if (/не видим|площадк|not on site|алаңда|Упс!/i.test(msg)) {
    return "not_on_territory";
  }
  return null;
}
