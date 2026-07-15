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
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <svg
            className="h-7 w-7 text-red-600 dark:text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Доступа нет</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Приложение доступно только через мобильное CarWash.
        </p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
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
