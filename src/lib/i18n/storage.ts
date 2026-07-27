export type AppLocale = "ru" | "kz" | "en";

export const APP_LOCALE_KEY = "app_locale";
export const I18N_CATALOG_KEY = "i18n_catalog";

export type CatalogEntry = {
  ru: string;
  en: string;
  kk: string;
};

export type I18nCatalog = Record<string, CatalogEntry>;

const DEFAULT_LOCALE: AppLocale = "ru";

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "ru" || value === "kz" || value === "en";
}

export function readLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const raw = window.localStorage.getItem(APP_LOCALE_KEY);
  return isAppLocale(raw) ? raw : DEFAULT_LOCALE;
}

export function persistLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_LOCALE_KEY, locale);
}

export function readCatalogCache(): I18nCatalog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(I18N_CATALOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as I18nCatalog) : null;
  } catch {
    return null;
  }
}

export function persistCatalog(catalog: I18nCatalog): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(I18N_CATALOG_KEY, JSON.stringify(catalog));
}