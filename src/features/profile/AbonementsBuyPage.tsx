"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  ABONEMENT_OFFERS,
  formatAbonementMoney,
  formatKwh,
  formatValidityDays,
  type AbonementOffer,
} from "./abonements";
import "./components/profile.css";
import "./abonements.css";

function offerSummary(offer: AbonementOffer): string {
  if (offer.kind === "ev") {
    return formatKwh(offer.totalKwh ?? 0);
  }
  if (offer.kind === "wash") {
    return `${offer.totalWashes ?? 0} моек`;
  }
  return `${formatKwh(offer.totalKwh ?? 0)} · ${offer.totalWashes ?? 0} моек`;
}

export default function AbonementsBuyPage() {
  const t = useT();

  return (
    <PageLayout
      title={t("profile.buy_abonement", "Купить абонемент")}
      className="page--profile-edit"
    >
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile/abonements" />
        </div>

        <p className="abonements-lead theme-description">
          {t(
            "profile.buy_abonement_hint",
            "Выберите карту — откроется превью и оплата.",
          )}
        </p>

        <section className="profile-card">
          {ABONEMENT_OFFERS.map((offer) => (
            <Link
              key={offer.id}
              href={`/profile/abonements/buy/${offer.id}`}
              className="profile-nav-row theme-hover"
            >
              <span
                className={`abonements-kind-dot abonements-kind-dot--${offer.kind}`}
                aria-hidden
              />
              <span className="profile-nav-row__main">
                <span className="profile-nav-row__label">{offer.title}</span>
                <span className="profile-nav-row__hint">{offerSummary(offer)}</span>
                <span className="abonements-list__deadline">
                  {t("profile.abonement_valid", "срок")}{" "}
                  {formatValidityDays(offer.validityDays)}
                </span>
              </span>
              <span className="abonements-list__spent">
                {formatAbonementMoney(offer.price)}
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
