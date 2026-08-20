"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  abonementKindClass,
  abonementKindSuffix,
  abonementProgress,
  fetchAbonementCards,
  formatAbonementDeadlineShort,
  formatAbonementMoney,
  formatKwh,
  isAbonementExpired,
  type AbonementCard,
} from "./abonements";
import brandIcon from "@/img/image_1787059580707.svg";
import "./components/profile.css";
import "./abonements.css";

const BRAND_ICON_SRC =
  typeof brandIcon === "string" ? brandIcon : brandIcon.src;

function OwnedPlasticCard({
  card,
  untilLabel,
  spentLabel,
  kwhLeftLabel,
  washLeftLabel,
}: {
  card: AbonementCard;
  untilLabel: string;
  spentLabel: string;
  kwhLeftLabel: string;
  washLeftLabel: string;
}) {
  const expired = isAbonementExpired(card.deadline);
  const isEv = card.kind === "ev";
  const remaining = isEv ? (card.remainingKwh ?? 0) : (card.remainingWashes ?? 0);
  const total = isEv ? (card.totalKwh ?? 0) : (card.totalWashes ?? 0);
  const ratio = abonementProgress(remaining, total);
  const pct = Math.round(ratio * 100);

  const hero = isEv ? formatKwh(remaining) : `${remaining}`;
  const heroUnit = isEv ? null : "моек";
  const heroHint = isEv ? kwhLeftLabel : washLeftLabel;

  return (
    <article
      className={`abonement-plastic abonement-plastic--list${expired ? " is-expired" : ""} ${abonementKindClass(card.kind)}`}
    >
      <div className="abonement-plastic__top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="abonement-plastic__logo"
          src={BRAND_ICON_SRC}
          alt=""
          aria-hidden
        />
        <div className="abonement-plastic__brand">
          <strong>{abonementKindSuffix(card.kind)}</strong>
        </div>
      </div>

      <div className="abonement-plastic__hero">
        <p className="abonement-plastic__hero-hint">{heroHint}</p>
        <p className="abonement-plastic__hero-value">
          {hero}
          {heroUnit ? (
            <span className="abonement-plastic__hero-unit"> {heroUnit}</span>
          ) : null}
        </p>
      </div>

      <div className="abonement-plastic__bars">
        <div className="abonement-plastic__progress">
          <div
            className="abonement-plastic__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={heroHint}
          >
            <span
              className="abonement-plastic__progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="abonement-plastic__number">{card.cardNumber}</p>

      <div className="abonement-plastic__meta abonement-plastic__meta--slide">
        <div>
          <span className="abonement-plastic__meta-label">{untilLabel}</span>
          <span className="abonement-plastic__meta-value">
            {formatAbonementDeadlineShort(card.deadline)}
          </span>
        </div>
        <div className="abonement-plastic__meta-right">
          <span className="abonement-plastic__meta-label">{spentLabel}</span>
          <span className="abonement-plastic__meta-value abonement-plastic__meta-value--price">
            {formatAbonementMoney(card.spentAmount)}
          </span>
        </div>
      </div>
    </article>
  );
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
          setError(
            t("profile.abonements_load_error", "Не удалось загрузить абонементы"),
          );
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

        {loading ? (
          <section className="profile-card">
            <p className="profile-garage-empty">
              {t("common.loading", "Загрузка…")}
            </p>
          </section>
        ) : error ? (
          <section className="profile-card">
            <p className="profile-garage-empty">{error}</p>
          </section>
        ) : cards.length === 0 ? (
          <section className="profile-card">
            <p className="profile-garage-empty">
              {t("profile.abonements_empty", "Пока нет абонементов")}
            </p>
          </section>
        ) : (
          <div className="abonements-stack">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/profile/abonements/${card.id}`}
                className="abonements-stack__item"
              >
                <OwnedPlasticCard
                  card={card}
                  untilLabel={t("profile.abonement_deadline", "До")}
                  spentLabel={t("profile.abonement_spent", "Потрачено")}
                  kwhLeftLabel={t(
                    "profile.abonement_kwh_left",
                    "Осталось кВт·ч",
                  )}
                  washLeftLabel={t(
                    "profile.abonement_wash_left",
                    "Осталось моек",
                  )}
                />
              </Link>
            ))}
          </div>
        )}

        <div className="abonements-buy-bar">
          <Link
            href="/profile/abonements/buy"
            className="theme-button w-full abonements-buy-btn"
          >
            {t("profile.buy_abonement", "Купить абонемент")}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
