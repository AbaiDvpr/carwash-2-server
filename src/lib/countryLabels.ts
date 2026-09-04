type TFn = (key: string, fallback?: string) => string;

const COUNTRY_FALLBACKS: Record<string, string> = {
  kz: "Казахстан",
  ru: "Россия",
  kg: "Кыргызстан",
  tj: "Таджикистан",
  uz: "Узбекистан",
  am: "Армения",
  ge: "Грузия",
  cn: "Китай",
  other: "Другой",
};

/** Локализует название страны госномера по ISO-коду. */
export function countryLabel(code: string | null | undefined, t: TFn): string {
  const key = (code ?? "").toLowerCase();
  if (!key) return t("garage.country_other", "Другой");
  return t(`garage.country_${key}`, COUNTRY_FALLBACKS[key] ?? key.toUpperCase());
}
