"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LAYOUT,
  THEME_LAYOUT_CHANGE_EVENT,
  THEME_LAYOUT_STORAGE_KEY,
  applyThemeLayout,
  readThemeLayout,
  resetThemeLayout as persistReset,
  setThemeLayoutField as persistField,
  writeThemeLayout,
  type ThemeLayout,
} from "@/lib/themeLayout";

export function useThemeLayout() {
  const [layout, setLayout] = useState<ThemeLayout>(DEFAULT_LAYOUT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const next = readThemeLayout();
    setLayout(next);
    applyThemeLayout(next);

    const sync = () => {
      const value = readThemeLayout();
      setLayout(value);
      applyThemeLayout(value);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_LAYOUT_STORAGE_KEY) return;
      sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_LAYOUT_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_LAYOUT_CHANGE_EVENT, sync);
    };
  }, []);

  const setField = useCallback((field: keyof ThemeLayout, value: string) => {
    const next = persistField(field, value);
    setLayout(next);
    applyThemeLayout(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    const next = persistReset();
    setLayout(next);
    applyThemeLayout(next);
    return next;
  }, []);

  const replaceAll = useCallback((nextLayout: ThemeLayout) => {
    const next = writeThemeLayout(nextLayout);
    setLayout(next);
    applyThemeLayout(next);
    return next;
  }, []);

  return {
    layout,
    mounted,
    setField,
    reset,
    replaceAll,
  };
}
