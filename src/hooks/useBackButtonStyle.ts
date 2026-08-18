"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readBackButtonStyle,
  writeBackButtonStyle,
  type BackButtonStyle,
} from "@/lib/backButtonStyle";

const CHANGE_EVENT = "hipoint:back-button-style";

export function useBackButtonStyle() {
  const [style, setStyleState] = useState<BackButtonStyle>("icon");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStyleState(readBackButtonStyle());
    setMounted(true);
    const onChange = () => setStyleState(readBackButtonStyle());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setStyle = useCallback((next: BackButtonStyle) => {
    writeBackButtonStyle(next);
    setStyleState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { style, setStyle, mounted };
}
