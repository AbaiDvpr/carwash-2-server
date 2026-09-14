import { ApiError } from "@/lib/api";
import type { AppLocale } from "@/lib/i18n/storage";

type LocaleText = { ru: string; en: string; kk: string };

const PLATE_TAKEN: LocaleText = {
  ru: "Этот номер уже привязан к другому аккаунту.",
  en: "This plate is already linked to another account.",
  kk: "Бұл нөмір басқа аккаунтқа байланған.",
};

const PLATE_OWN: LocaleText = {
  ru: "Этот номер уже есть в вашем гараже.",
  en: "This plate is already in your garage.",
  kk: "Бұл нөмір сіздің гаражда бар.",
};

const PLATE_REGEX: LocaleText = {
  ru: "Госномер: только латинские буквы и цифры.",
  en: "Plate: Latin letters and digits only.",
  kk: "Нөмір: тек латын әріптері мен цифрлар.",
};

const POWER_REQUIRED: LocaleText = {
  ru: "Выберите тип питания.",
  en: "Choose a power type.",
  kk: "Қорек түрін таңдаңыз.",
};

function pick(text: LocaleText, locale: AppLocale): string {
  if (locale === "en") return text.en;
  if (locale === "kz") return text.kk;
  return text.ru;
}

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

export function garageErrorCodeFromApi(body: {
  code?: string | null;
  message?: string | null;
  errors?: Record<string, string[]> | null;
} | null): string | null {
  if (
    body?.code === "plate_taken" ||
    body?.code === "plate_own" ||
    body?.code === "plate_regex" ||
    body?.code === "power_required"
  ) {
    return body.code;
  }

  const msg = `${body?.message ?? ""} ${Object.values(body?.errors ?? {})
    .flat()
    .join(" ")}`;

  if (
    /уже привязан|another account|already (linked|attached|bound)|басқа аккаунт|байланған/i.test(
      msg,
    )
  ) {
    return "plate_taken";
  }
  if (
    /уже есть в вашем гараже|already been taken|already in your garage|гаражда бар/i.test(
      msg,
    )
  ) {
    return "plate_own";
  }
  if (/латинск|latin letters|латын әріп/i.test(msg)) {
    return "plate_regex";
  }
  if (/тип питания|power type|қорек түрін/i.test(msg)) {
    return "power_required";
  }

  return null;
}

export function garageErrorMessage(
  t: (key: string, fallback?: string) => string,
  code: string | null | undefined,
  locale: AppLocale = "ru",
): string | null {
  switch (code) {
    case "plate_taken":
      return localized(t, "garage.plate_taken", PLATE_TAKEN, locale);
    case "plate_own":
      return localized(t, "garage.plate_own", PLATE_OWN, locale);
    case "plate_regex":
      return localized(t, "garage.plate_regex", PLATE_REGEX, locale);
    case "power_required":
      return localized(t, "garage.power_required", POWER_REQUIRED, locale);
    default:
      return null;
  }
}

/** Ошибка гаража с API — всегда через t()/locale, без сырого RU с бэка. */
export function garageApiError(
  err: unknown,
  t: (key: string, fallback?: string) => string,
  locale: AppLocale,
  fallback: string,
): string {
  const body =
    err instanceof ApiError
      ? (err.body as {
          code?: string | null;
          message?: string | null;
          errors?: Record<string, string[]> | null;
        } | null)
      : null;

  const translated = garageErrorMessage(
    t,
    garageErrorCodeFromApi(body),
    locale,
  );
  if (translated) return translated;

  return (
    body?.errors?.pistol_type_id?.[0] ??
    body?.errors?.fuel_type_id?.[0] ??
    body?.errors?.car_plate?.[0] ??
    body?.errors?.power_type?.[0] ??
    body?.message ??
    fallback
  );
}
