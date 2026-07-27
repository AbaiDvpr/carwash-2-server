"use client";

import { useCallback } from "react";
import { translate } from "@/lib/i18n/catalog";
import type { AppLocale } from "@/lib/i18n/storage";
import { useAppSelector } from "@/store/hooks";

export function useLocale(): AppLocale {
  return useAppSelector((s) => s.i18n.locale);
}

export function useI18nStatus() {
  return useAppSelector((s) => s.i18n.status);
}

/** `t("home.balance")` — ключ = group.key из API. */
export function useT() {
  const locale = useAppSelector((s) => s.i18n.locale);
  const catalog = useAppSelector((s) => s.i18n.catalog);

  return useCallback(
    (key: string, fallback?: string) => translate(catalog, locale, key, fallback),
    [catalog, locale],
  );
}
