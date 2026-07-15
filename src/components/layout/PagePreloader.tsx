"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AppPreloader from "./AppPreloader";

const MIN_VISIBLE_MS = 450;

export default function PagePreloader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Первый заход уже покрыт прелоадером проверки доступа
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    setIsLoading(true);

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, MIN_VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [pathname, mounted]);

  if (!mounted || !isLoading) {
    return null;
  }

  return <AppPreloader />;
}
