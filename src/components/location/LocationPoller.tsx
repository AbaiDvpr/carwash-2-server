"use client";

import { useEffect } from "react";
import { fetchTranslations } from "@/lib/api/translate";
import { ensureLocationPolling } from "@/lib/locationController";

/** Один раз на всё приложение: гео кэш + опрос каждые 5 минут. */
export default function LocationPoller() {
  useEffect(() => {
    ensureLocationPolling();
  }, []);

  useEffect(() => {
    console.log("LocationPoller-test");
    void fetchTranslations()
      .then((translations) => {
        console.log("API-will be here for translate", translations);
      })
      .catch((err) => {
        console.error("fetchTranslations failed", err);
      });
  }, []);

  return null;
}
