"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  ABONEMENT_CARDS,
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
  if (card.kind === "wash") {
    return `${card.remainingWashes ?? 0} моек`;
  }
  return `${formatKwh(card.remainingKwh ?? 0)} · ${card.remainingWashes ?? 0} моек`;
}

export default function AbonementsPage() {
  const t = useT();

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

        <section className="profile-card">
          {ABONEMENT_CARDS.map((card) => (
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
          ))}
        </section>
      </div>
    </PageLayout>
  );
}
