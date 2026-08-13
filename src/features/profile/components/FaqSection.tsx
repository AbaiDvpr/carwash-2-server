"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/hooks/useT";
import { fetchFaqs, localizeFaqs } from "@/lib/api/faq";
import { FAQ_ITEMS, FAQ_TABS, type FaqCategory, type FaqItem } from "../faq";

export default function FaqSection() {
  const t = useT();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<FaqCategory>("wash");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [items, setItems] = useState<FaqItem[]>(FAQ_ITEMS);

  useEffect(() => {
    let cancelled = false;

    fetchFaqs()
      .then((faqs) => {
        if (cancelled) return;
        const localized = localizeFaqs(faqs, locale);
        setItems(localized.length > 0 ? localized : FAQ_ITEMS);
      })
      .catch(() => {
        if (!cancelled) setItems(FAQ_ITEMS);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.category === activeTab),
    [items, activeTab],
  );

  return (
    <div className="profile-edit-fields">
      <div className="profile-edit-row">
        <span className="profile-edit-row__label">
          {t("profile.faq", "Частые вопросы")}
        </span>

        <div
          className="profile-faq__tabs"
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
                className={`profile-faq__tab${active ? " is-active" : ""}`}
              >
                {t(tab.labelKey, tab.fallback)}
              </button>
            );
          })}
        </div>

        <div className="profile-faq__list">
          {visibleItems.length === 0 ? (
            <p className="profile-promo__hint" style={{ marginTop: 0 }}>
              {t("profile.faq_empty", "Пока нет вопросов")}
            </p>
          ) : (
            visibleItems.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                  className={`profile-doc-row profile-faq__item${isOpen ? " is-open" : ""}`}
                  aria-expanded={isOpen}
                >
                  <span className="profile-doc-row__main">
                    <span className="profile-doc-row__label">{item.question}</span>
                    {isOpen ? (
                      <span className="profile-faq__answer">{item.answer}</span>
                    ) : null}
                  </span>
                  <svg
                    className={`profile-doc-row__chevron profile-faq__chevron${isOpen ? " is-open" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
