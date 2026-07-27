import type { Translation } from "@/lib/api/translate";
import type { AppLocale, I18nCatalog } from "./storage";

export function buildCatalog(rows: Translation[]): I18nCatalog {
  const catalog: I18nCatalog = {};
  for (const row of rows) {
    catalog[`${row.group}.${row.key}`] = {
      ru: row.ruValue ?? "",
      en: row.enValue ?? "",
      kk: row.kkValue ?? "",
    };
  }
  return catalog;
}

export function translate(
  catalog: I18nCatalog,
  locale: AppLocale,
  key: string,
  fallback?: string,
): string {
  const entry = catalog[key];
  if (!entry) return fallback ?? key;
  if (locale === "en") return entry.en || entry.ru || fallback || key;
  if (locale === "kz") return entry.kk || entry.ru || fallback || key;
  return entry.ru || fallback || key;
}