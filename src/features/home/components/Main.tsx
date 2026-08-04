"use client";

import Link from "next/link";
import { useAuthUser, formatPhoneDisplay } from "@/hooks/useAuthUser";
import {
  formatBalance,
  useUserBalance,
} from "@/features/profile/hooks/useUserBalance";
import { useT } from "@/hooks/useT";
import { navigateNavbar } from "@/lib/navbarController";
import type { StationKind } from "@/data/stations";
import { createDefaultFilters, writeMapFilters } from "@/features/map/filters";
import Stories from "./Stories";

const CATEGORIES: {
  kind: StationKind;
  titleKey: string;
  fallback: string;
}[] = [
  {
    kind: "charging",
    titleKey: "home.charge_car",
    fallback: "Зарядить автомобиль",
  },
  {
    kind: "wash",
    titleKey: "home.wash_car",
    fallback: "Помыть машину",
  },
];

export default function Main() {
  const t = useT();
  const { phone, mounted: userMounted } = useAuthUser();
  const { balance, loading: balanceLoading, formatted } = useUserBalance();
  const balanceLabel =
    balanceLoading && balance == null ? "…" : formatted || formatBalance(0);

  const openProfile = () => {
    navigateNavbar("profile");
  };

  return (
    <div className="app-stack">
      <Stories />

      <section className="app-section">
        <div className="app-row app-row--between">
          <div className="min-w-0">
            <p className="theme-description text-[11px] font-medium">
              {t("home.phone", "Телефон")}
            </p>
            <p
              className="mt-0.5 truncate text-[16px] font-semibold tracking-tight"
              style={{ color: "var(--app-text)" }}
            >
              {userMounted ? formatPhoneDisplay(phone) : "…"}
            </p>
          </div>

          <button type="button" onClick={openProfile} className="shrink-0 text-right">
            <p className="theme-description text-[11px] font-medium">
              {t("home.balance", "Баланс")}
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold tracking-tight tabular-nums"
              style={{ color: "var(--app-text)" }}
            >
              {balanceLabel}
            </p>
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
          <h2
            className="text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--app-text)" }}
          >
            {t("home.categories", "Категории")}
          </h2>
          <Link
            href="/map"
            className="inline-flex items-center gap-0.5 text-[13px] font-medium"
            style={{ color: "var(--app-button)" }}
          >
            {t("common.nav_map", "Карта")}
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden
            >
              <path strokeLinecap="round" d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((category) => {
            const isCharge = category.kind === "charging";
            return (
              <Link
                key={category.kind}
                href="/map"
                onClick={() => writeMapFilters(createDefaultFilters(category.kind))}
                className="app-section group relative flex min-h-[168px] flex-col transition active:scale-[0.98]"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25"
                  style={{
                    background: `linear-gradient(to top, var(--app-button), transparent)`,
                  }}
                  aria-hidden
                />

                <div
                  className="relative z-[1] flex h-full flex-col"
                  style={{
                    padding: "var(--app-row-pad-y) var(--app-row-pad-x)",
                  }}
                >
                  <h3
                    className="text-[14px] font-semibold leading-snug"
                    style={{ color: "var(--app-text)" }}
                  >
                    {t(category.titleKey, category.fallback)}
                  </h3>

                  <div
                    className="mt-auto flex justify-end pt-6"
                    style={{ color: "var(--app-button)" }}
                  >
                    {isCharge ? (
                      <svg
                        className="h-12 w-12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
                      </svg>
                    ) : (
                      <svg
                        className="h-11 w-11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.7}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
