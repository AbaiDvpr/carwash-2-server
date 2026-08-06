"use client";

import { useMemo, useState } from "react";
import { useT } from "@/hooks/useT";
import { FAQ_ITEMS, FAQ_TABS, type FaqCategory } from "../faq";

export default function FaqSection() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<FaqCategory>("wash");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const items = useMemo(
    () => FAQ_ITEMS.filter((item) => item.category === activeTab),
    [activeTab],
  );

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {t("profile.faq", "Частые вопросы")}
      </p>

      <div
        className="mb-2 flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60"
        role="tablist"
        aria-label={t("profile.faq", "Частые вопросы")}
      >
        {FAQ_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveTab(tab.id);
                setOpenFaqId(null);
              }}
              className={[
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="app-section">
        {items.length === 0 ? (
          <p className="px-3 py-3 text-center text-xs text-zinc-400">
            Пока нет вопросов
          </p>
        ) : (
          items.map((item, index) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id}>
                {index > 0 ? (
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                  className="app-row app-row--between text-left hover:bg-[var(--app-hover)]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {item.question}
                    </span>
                    {isOpen ? (
                      <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {item.answer}
                      </span>
                    ) : null}
                  </span>
                  <svg
                    className={`mt-1 h-3.5 w-3.5 shrink-0 text-zinc-300 transition ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
