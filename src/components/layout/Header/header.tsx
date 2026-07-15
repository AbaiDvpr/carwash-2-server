"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserSessionInfo from "@/components/session/UserSessionInfo";
import { NAVBAR_ROUTES } from "@/lib/navbarController";
import { getHeaderVisible } from "@/lib/userSession";
import { useAppSelector } from "@/store/hooks";

const NAV_LINKS = [
  { href: NAVBAR_ROUTES.map, label: "Карта" },
  { href: NAVBAR_ROUTES.history, label: "История" },
  { href: NAVBAR_ROUTES.chatbot, label: "Чат" },
  { href: NAVBAR_ROUTES.profile, label: "Профиль" },
];

export default function Header() {
  const pathname = usePathname();
  const showHeaderNavFromStore = useAppSelector((state) => state.app.showHeaderNav);
  const [showNavFromStorage, setShowNavFromStorage] = useState(false);

  useEffect(() => {
    setShowNavFromStorage(getHeaderVisible() === "true");
  }, []);

  const showNav = showHeaderNavFromStore || showNavFromStorage;

  if (pathname.startsWith("/payment")) {
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
        {showNav ? (
          <nav className="flex flex-row gap-3 text-xs">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname === href
                    ? "font-medium text-blue-600"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}

        <UserSessionInfo compact />
      </div>
    </div>
  );
}
