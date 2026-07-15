"use client";

import { useCallback, useEffect, useState } from "react";
import { readAppEnvironment, type AppEnvironment } from "@/lib/appEnvironment";
import { readUserSession } from "@/lib/userSession";

const BRIDGE_READY_EVENT = "carwash-bridge-ready";

type AppEnvironmentState = AppEnvironment & {
  email: string | null;
  source: string | null;
};

const initialState: AppEnvironmentState = {
  hasNativeBridge: false,
  isMobileSource: false,
  isMobileApp: false,
  isWebBrowser: true,
  email: null,
  source: null,
};

export function useAppEnvironment() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AppEnvironmentState>(initialState);

  const sync = useCallback(() => {
    const session = readUserSession();
    setState({
      ...readAppEnvironment(),
      email: session.email,
      source: session.source,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener(BRIDGE_READY_EVENT, sync);

    const interval = window.setInterval(sync, 300);
    const stopInterval = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 3000);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(BRIDGE_READY_EVENT, sync);
      window.clearInterval(interval);
      window.clearTimeout(stopInterval);
    };
  }, [sync]);

  return { ...state, mounted, sync };
}

export { BRIDGE_READY_EVENT };
