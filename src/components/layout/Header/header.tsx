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

  const showNav = showHeaderNavFromStore || showNavFromStorage ;

  if (pathname.startsWith("/payment")) {
    return null;
  }
 
  return (
    <div className="app-header flex shrink-0 flex-row items-center justify-between border-b border-gray-200 bg-(--bacground)">
      <div className="px-4 py-3">
        <h1 className="text-2xl font-bold">CarWash</h1>
      </div>
      <div className="flex flex-row items-center gap-6 px-4 py-3">
        
        {showNav && (
          <nav className="flex flex-row gap-4 text-sm">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "font-semibold text-blue-600" : "text-zinc-600"}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}

        <UserSessionInfo compact />
      </div>
    </div>
  );
}
