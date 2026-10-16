"use client";

import { useEffect } from "react";
import {
  applyKeyboardInset,
  scrollFocusedFieldIntoView,
} from "@/lib/keyboardInset";

/**
 * Следит за visualViewport: при открытии клавиатуры ставит --app-keyboard-h
 * и чуть прокручивает focused input выше клавиатуры.
 */
export default function KeyboardInsetBoot() {
  useEffect(() => {
    let scrollTimer: number | null = null;

    const sync = () => {
      const px = applyKeyboardInset();
      if (px <= 0) return;
      if (scrollTimer != null) window.clearTimeout(scrollTimer);
      // Ждём анимацию клавиатуры / resize WebView
      scrollTimer = window.setTimeout(() => {
        scrollFocusedFieldIntoView();
      }, 280);
    };

    applyKeyboardInset();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("focusin", sync);

    const onFocusOut = () => {
      // После blur клавиатура ещё закрывается — синхронизируем чуть позже
      window.setTimeout(() => applyKeyboardInset(), 180);
    };
    document.addEventListener("focusout", onFocusOut);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", onFocusOut);
      if (scrollTimer != null) window.clearTimeout(scrollTimer);
      document.documentElement.style.setProperty("--app-keyboard-h", "0px");
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);

  return null;
}
