"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PRELOADER_VARIANT,
  hasCustomPreloaderVariant,
  readPreloaderVariant,
  resetPreloaderVariant,
  writePreloaderVariant,
} from "@/lib/preloaderVariant";
import type { PreloaderVariant } from "@/features/profile/components/preloaderVariants";

const CHANGE_EVENT = "hipoint:preloader-variant";

export function usePreloaderVariant() {
  const [variant, setVariantState] = useState<PreloaderVariant>(
    DEFAULT_PRELOADER_VARIANT,
  );
  const [isDefault, setIsDefault] = useState(true);
  const [mounted, setMounted] = useState(false);

  const syncFromStorage = useCallback(() => {
    setVariantState(readPreloaderVariant());
    setIsDefault(!hasCustomPreloaderVariant());
  }, []);

  useEffect(() => {
    syncFromStorage();
    setMounted(true);
    const onChange = () => syncFromStorage();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [syncFromStorage]);

  const setVariant = useCallback((next: PreloaderVariant) => {
    writePreloaderVariant(next);
    setVariantState(next);
    setIsDefault(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const resetToDefault = useCallback(() => {
    resetPreloaderVariant();
    setVariantState(DEFAULT_PRELOADER_VARIANT);
    setIsDefault(true);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { variant, setVariant, resetToDefault, isDefault, mounted };
}
