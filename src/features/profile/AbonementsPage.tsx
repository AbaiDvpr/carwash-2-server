"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  fetchAbonementCards,
  formatAbonementDeadline,
  formatAbonementMoney,
  formatKwh,
  type AbonementCard,
} from "./abonements";
import "./components/profile.css";
import "./abonements.css";

function cardSummary(card: AbonementCard): string {
  if (card.kind === "ev") {
    return formatKwh(card.remainingKwh ?? 0);
  }
  return `${card.remainingWashes ?? 0} моек`;
}

export default function AbonementsPage() {
  const t = useT();
  const [cards, setCards] = useState<AbonementCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAbonementCards();
        if (!cancelled) {
          setCards(data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("profile.abonements_load_error", "Не удалось загрузить абонементы"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <PageLayout
      title={t("profile.abonements", "Абонементы")}
      className="page--profile-edit"
    >
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile" />
        </div>

        <p className="abonements-lead theme-description">
          {t(
            "profile.abonements_hint",
            "Ваши онлайн-карты. Нажмите, чтобы посмотреть остаток.",
          )}
        </p>

        <Link
          href="/profile/abonements/buy"
          className="theme-button w-full abonements-buy-btn"
        >
          {t("profile.buy_abonement", "Купить абонемент")}
        </Link>

        <section className="profile-card">
          {loading ? (
            <p className="profile-garage-empty">{t("common.loading", "Загрузка…")}</p>
          ) : error ? (
            <p className="profile-garage-empty">{error}</p>
          ) : cards.length === 0 ? (
            <p className="profile-garage-empty">
              {t("profile.abonements_empty", "Пока нет абонементов")}
            </p>
          ) : (
            cards.map((card) => (
              <Link
                key={card.id}
                href={`/profile/abonements/${card.id}`}
                className="profile-nav-row theme-hover"
              >
                <span className="profile-nav-row__main">
                  <span className="profile-nav-row__label">{card.title}</span>
                  <span className="profile-nav-row__hint">{cardSummary(card)}</span>
                  <span className="abonements-list__deadline">
                    {t("profile.abonement_until", "до")}{" "}
                    {formatAbonementDeadline(card.deadline)}
                  </span>
                </span>
                <span className="abonements-list__spent">
                  {formatAbonementMoney(card.spentAmount)}
                </span>
                <svg
                  className="profile-nav-row__chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            ))
          )}
        </section>
      </div>
    </PageLayout>
  );
}
