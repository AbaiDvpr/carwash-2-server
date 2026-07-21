"use client";

import Link from "next/link";
import { useAuthUser, formatPhoneDisplay } from "@/hooks/useAuthUser";
import {
  formatBalance,
  useUserBalance,
} from "@/features/profile/hooks/useUserBalance";
import type { StationKind } from "@/data/stations";
import Stories from "./Stories";

const CATEGORIES: {
  kind: StationKind;
  title: string;
  href: string;
}[] = [
  {
    kind: "charging",
    title: "Зарядить автомобиль",
    href: "/map?kind=charging",
  },
  {
    kind: "wash",
    title: "Помыть машину",
    href: "/map?kind=wash",
  },
];

export default function Main() {
  const { phone, mounted: userMounted } = useAuthUser();
  const { balance, loading: balanceLoading, formatted } = useUserBalance();
  const balanceLabel =
    balanceLoading && balance == null ? "…" : formatted || formatBalance(0);

  return (
    <div className="space-y-5">
      <Stories />

      <section className="theme-block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="theme-description text-[11px] font-medium">Телефон</p>
            <p
              className="mt-0.5 truncate text-[16px] font-semibold tracking-tight"
              style={{ color: "var(--app-text)" }}
            >
              {userMounted ? formatPhoneDisplay(phone) : "…"}
            </p>
          </div>

          <Link href="/profile" className="shrink-0 text-right">
            <p className="theme-description text-[11px] font-medium">Баланс</p>
            <p
              className="mt-0.5 text-[16px] font-semibold tracking-tight tabular-nums"
              style={{ color: "var(--app-text)" }}
            >
              {balanceLabel}
            </p>
          </Link>
        </div>

        <Link
          href="/profile"
          className="theme-button flex items-center justify-between gap-2 border-t border-black/5 px-4 py-3 transition"
        >
          <span className="text-[13px] font-semibold">Пополнить баланс</span>
          <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold opacity-90">
            Перейти
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden
            >
              <path strokeLinecap="round" d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
          <h2
            className="text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--app-text)" }}
          >
            Категории
          </h2>
          <Link
            href="/map"
            className="inline-flex items-center gap-0.5 text-[13px] font-medium"
            style={{ color: "var(--app-button)" }}
          >
            Карта
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
                href={category.href}
                className="theme-block theme-hover group relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border border-zinc-200 transition active:scale-[0.98] dark:border-zinc-800"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25"
                  style={{
                    background: `linear-gradient(to top, var(--app-button), transparent)`,
                  }}
                  aria-hidden
                />

                <div className="relative z-[1] flex h-full flex-col p-3.5">
                  <h3
                    className="text-[14px] font-semibold leading-snug"
                    style={{ color: "var(--app-text)" }}
                  >
                    {category.title}
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
