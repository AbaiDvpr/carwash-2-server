import {
  PRELOADER_VARIANTS,
  type PreloaderVariant,
} from "@/features/profile/components/preloaderVariants";

export const PRELOADER_VARIANT_KEY = "hipoint.preloaderVariant";

/** По умолчанию — круглый спиннер без иконки */
export const DEFAULT_PRELOADER_VARIANT: PreloaderVariant = "circle-rotate";

const VARIANT_IDS = new Set(PRELOADER_VARIANTS.map((item) => item.id));

export function isPreloaderVariant(value: string): value is PreloaderVariant {
  return VARIANT_IDS.has(value as PreloaderVariant);
}

export function readPreloaderVariant(): PreloaderVariant {
  if (typeof window === "undefined") return DEFAULT_PRELOADER_VARIANT;
  try {
    const raw = window.localStorage.getItem(PRELOADER_VARIANT_KEY);
    if (raw && isPreloaderVariant(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_PRELOADER_VARIANT;
}

export function writePreloaderVariant(variant: PreloaderVariant) {
  try {
    window.localStorage.setItem(PRELOADER_VARIANT_KEY, variant);
  } catch {
    /* ignore */
  }
}

export function hasCustomPreloaderVariant(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(PRELOADER_VARIANT_KEY);
    return Boolean(raw && isPreloaderVariant(raw));
  } catch {
    return false;
  }
}

/** Сброс к встроенному стандартному прелоадеру приложения */
export function resetPreloaderVariant() {
  try {
    window.localStorage.removeItem(PRELOADER_VARIANT_KEY);
  } catch {
    /* ignore */
  }
}
