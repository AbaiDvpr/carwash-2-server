"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAppEnvironment } from "@/hooks/useAppEnvironment";
import { hasAccessToken } from "@/lib/authToken";
import { forceLogout } from "@/lib/forceLogout";
import { grantAccess, isAccessGranted } from "@/lib/userSession";
import AppPreloader from "./AppPreloader";

const BRIDGE_WAIT_MS = 3000;

type MobileAccessGateProps = {
  children: ReactNode;
};

function AccessDenied() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Доступа нет</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Приложение доступно только через мобильное CarWash.
        </p>
        <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          Откройте сайт в официальном приложении.
        </p>
      </div>
    </div>
  );
}

export default function MobileAccessGate({ children }: MobileAccessGateProps) {
  const { isMobileApp, mounted } = useAppEnvironment();
  // Всегда "checking" на SSR и первом клиентском рендере — иначе hydration mismatch
  const [status, setStatus] = useState<"checking" | "granted" | "denied">("checking");

  useEffect(() => {
    if (isAccessGranted()) {
      if (!hasAccessToken()) {
        forceLogout();
        return;
      }
      setStatus("granted");
      return;
    }

    if (isMobileApp) {
      if (!hasAccessToken()) {
        forceLogout();
        return;
      }
      grantAccess();
      setStatus("granted");
      return;
    }

    if (!mounted) return;

    const timer = window.setTimeout(() => {
      setStatus("denied");
    }, BRIDGE_WAIT_MS);

    return () => window.clearTimeout(timer);
  }, [mounted, isMobileApp]);

  if (status === "denied") {
    return <AccessDenied />;
  }

  return (
    <>
      <div
        className={[
          "app-root",
          status === "checking" ? "invisible pointer-events-none" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={status === "checking"}
      >
        {children}
      </div>
      {status === "checking" && <AppPreloader />}
    </>
  );
}
