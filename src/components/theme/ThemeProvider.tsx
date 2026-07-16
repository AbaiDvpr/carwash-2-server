"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, readTheme } from "@/lib/theme";

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Тема только из localStorage (настройка в профиле).
 * Системный dark mode телефона игнорируется.
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    applyTheme(readTheme());

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      applyTheme(readTheme());
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return children;
}
