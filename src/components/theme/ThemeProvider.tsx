"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, readTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import {
  applyThemePalette,
  readThemePalettes,
  THEME_PALETTE_STORAGE_KEY,
} from "@/lib/themeColors";
import {
  applyThemeLayout,
  readThemeLayout,
  THEME_LAYOUT_STORAGE_KEY,
} from "@/lib/themeLayout";
import { notifyThemeChanged } from "@/lib/themeController";

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Тема и палитра только из localStorage (настройка в профиле).
 * Системный dark mode телефона игнорируется.
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    const theme = readTheme();
    applyTheme(theme);
    applyThemeLayout(readThemeLayout());
    notifyThemeChanged(theme);

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const next = readTheme();
        applyTheme(next);
        notifyThemeChanged(next);
        return;
      }
      if (event.key === THEME_PALETTE_STORAGE_KEY) {
        applyThemePalette(readTheme(), readThemePalettes());
        return;
      }
      if (event.key === THEME_LAYOUT_STORAGE_KEY) {
        applyThemeLayout(readThemeLayout());
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return children;
}
