"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  applyNavbarInset,
  NAVBAR_H_STORAGE_KEY,
} from "@/lib/navbarInset";

/** Flutter может записать navbar_h после первого кадра. */
const POLL_MS = 200;
const POLL_FOR_MS = 4000;

/**
 * Синхронизирует Redux `navbar_source` и localStorage.navbar_h с CSS.
 */
export default function NavbarInsetBoot() {
  const enabled = useAppSelector((state) => state.app.navbar_source);

  useEffect(() => {
    applyNavbarInset(enabled);
    if (!enabled) return;

    const onStorage = (event: StorageEvent) => {
      if (event.key === NAVBAR_H_STORAGE_KEY) applyNavbarInset(true);
    };
    window.addEventListener("storage", onStorage);

    const started = Date.now();
    const timer = window.setInterval(() => {
      applyNavbarInset(true);
      if (Date.now() - started >= POLL_FOR_MS) window.clearInterval(timer);
    }, POLL_MS);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [enabled]);

  return null;
}
