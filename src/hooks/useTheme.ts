"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readTheme,
  setTheme as persistTheme,
  THEME_CHANGE_EVENT,
  toggleTheme as flipTheme,
  type AppTheme,
} from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemeState(readTheme());

    const sync = () => setThemeState(readTheme());
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = flipTheme();
    setThemeState(next);
    return next;
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    mounted,
    setTheme,
    toggleTheme,
  };
}
