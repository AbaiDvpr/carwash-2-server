"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import UserSessionInfo from "@/components/session/UserSessionInfo";
import { useT } from "@/hooks/useT";
import {
  navigateNavbar,
  type WebNavbarScreen,
} from "@/lib/navbarController";
import { isHeaderNavigationEnabled } from "@/lib/userSession";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHeaderNav } from "@/store/slices/appSlice";

const NAV_LINKS: { screen: WebNavbarScreen; key: string; fallback: string }[] = [
  { screen: "map", key: "common.nav_map", fallback: "Карта" },
  { screen: "history", key: "common.nav_history", fallback: "История" },
  { screen: "chatbot", key: "common.nav_chat", fallback: "Чат" },
  { screen: "profile", key: "common.nav_profile", fallback: "Профиль" },
];

export default function Header() {
  const t = useT();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const showHeader = useAppSelector((state) => state.app.showHeaderNav);

  useEffect(() => {
    dispatch(setHeaderNav(isHeaderNavigationEnabled()));
  }, [dispatch]);

  if (!showHeader) return null;

  if (
    pathname === "/" ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/map")
  ) {
    return null;
  }

  return (
    <div className="app-header flex shrink-0 flex-row items-center justify-between border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-4 py-2.5">
        <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          CarWash
        </h1>
      </div>
      <div className="flex flex-row items-center gap-4 px-4 py-2.5">
        <nav className="flex flex-row gap-3 text-xs">
          {NAV_LINKS.map(({ screen, key, fallback }) => {
            const active =
              (screen === "map" && (pathname === "/" || pathname.startsWith("/map"))) ||
              (screen === "history" && pathname.startsWith("/profile/history")) ||
              (screen === "chatbot" && pathname.startsWith("/chatbot")) ||
              (screen === "profile" &&
                pathname.startsWith("/profile") &&
                !pathname.startsWith("/profile/history"));

            return (
              <button
                key={screen}
                type="button"
                onClick={() => navigateNavbar(screen)}
                className={
                  active
                    ? "font-medium text-blue-600"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }
              >
                {t(key, fallback)}
              </button>
            );
          })}
        </nav>

        <UserSessionInfo compact />
      </div>
    </div>
  );
}
