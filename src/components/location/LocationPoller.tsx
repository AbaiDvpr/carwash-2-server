"use client";

import { useEffect } from "react";
import { ensureLocationPolling } from "@/lib/locationController";

/** Один раз на всё приложение: гео кэш + опрос каждые 5 минут. */
export default function LocationPoller() {
  useEffect(() => {
    ensureLocationPolling();
  }, []);

  return null;
}
