"use client";

import { useEffect } from "react";
import { fetchTranslations } from "@/lib/api/translate";
import { buildCatalog } from "@/lib/i18n/catalog";
import { readCatalogCache, readLocale } from "@/lib/i18n/storage";
import { notifyLocaleChanged } from "@/lib/localeController";
import { useAppDispatch } from "@/store/hooks";
import {
  hydrateFromStorage,
  setCatalog,
  setI18nError,
  setI18nStatus,
} from "@/store/slices/i18nSlice";

/**
 * Переводы:
 * 1) если есть localStorage → сразу из кэша (ready)
 * 2) без кэша → loading + API
 * 3) с кэшем → тихо обновить с API в фоне (без loading)
 */
export default function I18nBoot() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const cached = readCatalogCache();
    const hasCache = Boolean(cached && Object.keys(cached).length > 0);

    dispatch(hydrateFromStorage());
    notifyLocaleChanged(readLocale());

    if (!hasCache) {
      dispatch(setI18nStatus("loading"));
    }

    void fetchTranslations()
      .then((rows) => {
        dispatch(setCatalog(buildCatalog(rows)));
      })
      .catch((err) => {
        // Кэш уже есть — оставляем его, ошибку не показываем как фатал
        if (hasCache) {
          console.warn("translations refresh failed, using cache", err);
          return;
        }
        const message = err instanceof Error ? err.message : "translations_failed";
        dispatch(setI18nError(message));
        console.error("fetchTranslations failed", err);
      });
  }, [dispatch]);

  return null;
}
