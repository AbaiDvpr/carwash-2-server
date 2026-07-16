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
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-xs text-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">HiPoint</p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Скачайте приложение
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Веб-версия недоступна. Откройте CarWash в приложении из магазина.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.6 2.2 13.2 12 3.6 21.8A1.5 1.5 0 0 1 1.5 20.7V3.3A1.5 1.5 0 0 1 3.6 2.2Zm11.3 11.2 2.3 2.3-8.8 5.1 6.5-7.4Zm3.5-2.1 2 1.1a1.5 1.5 0 0 1 0 2.6l-2 1.1-2.5-2.4 2.5-2.4ZM8.4 2.9l8.8 5.1-2.3 2.3-6.5-7.4Z" />
            </svg>
            Google Play
          </a>
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.5-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.2-2.5 1.3-2.6-.03-.01-2.4-.9-2.7-4.5Zm-2.5-7.3c.7-.8 1.1-1.9 1-3-.9.1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.4Z" />
            </svg>
            App Store
          </a>
        </div>
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
        forceLogout({
          reason:
            "MobileAccessGate: доступ уже выдан (session), но access_token ещё нет в localStorage",
          source: "MobileAccessGate",
        });
        // В test_version показываем UI + error-блок, не зависаем на прелоадере
        setStatus("granted");
        return;
      }
      setStatus("granted");
      return;
    }

    if (isMobileApp) {
      if (!hasAccessToken()) {
        forceLogout({
          reason:
            "MobileAccessGate: WebView/приложение определено, но access_token не передан",
          source: "MobileAccessGate",
        });
        setStatus("granted");
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
