"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, readTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import {
  applyThemePalette,
  readThemePalettes,
  THEME_PALETTE_STORAGE_KEY,
} from "@/lib/themeColors";

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Тема и палитра только из localStorage (настройка в профиле).
 * Системный dark mode телефона игнорируется.
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    applyTheme(readTheme());

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        applyTheme(readTheme());
        return;
      }
      if (event.key === THEME_PALETTE_STORAGE_KEY) {
        applyThemePalette(readTheme(), readThemePalettes());
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return children;
}
