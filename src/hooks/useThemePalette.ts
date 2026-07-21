"use client";

import { useCallback, useEffect, useState } from "react";
import { readTheme } from "@/lib/theme";
import {
  DEFAULT_PALETTES,
  THEME_PALETTE_CHANGE_EVENT,
  THEME_PALETTE_STORAGE_KEY,
  applyThemePalette,
  readThemePalettes,
  resetThemePalette as persistReset,
  setThemePaletteField as persistField,
  writeThemePalettes,
  type ThemeMode,
  type ThemePalette,
  type ThemePalettes,
} from "@/lib/themeColors";

export function useThemePalette() {
  const [palettes, setPalettes] = useState<ThemePalettes>(DEFAULT_PALETTES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const next = readThemePalettes();
    setPalettes(next);
    applyThemePalette(readTheme(), next);

    const sync = () => {
      const value = readThemePalettes();
      setPalettes(value);
      applyThemePalette(readTheme(), value);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_PALETTE_STORAGE_KEY) return;
      sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_PALETTE_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_PALETTE_CHANGE_EVENT, sync);
    };
  }, []);

  const setField = useCallback(
    (mode: ThemeMode, field: keyof ThemePalette, value: string) => {
      const next = persistField(mode, field, value);
      setPalettes(next);
      applyThemePalette(readTheme(), next);
      return next;
    },
    [],
  );

  const reset = useCallback((mode?: ThemeMode) => {
    const next = persistReset(mode);
    setPalettes(next);
    applyThemePalette(readTheme(), next);
    return next;
  }, []);

  const replaceAll = useCallback((nextPalettes: ThemePalettes) => {
    const next = writeThemePalettes(nextPalettes);
    setPalettes(next);
    applyThemePalette(readTheme(), next);
    return next;
  }, []);

  return {
    palettes,
    mounted,
    setField,
    reset,
    replaceAll,
  };
}
