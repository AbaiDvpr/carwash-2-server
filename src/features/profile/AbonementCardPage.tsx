"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  fetchAbonementCard,
  formatAbonementDeadline,
  formatAbonementUsed,
  formatKwh,
  formatKwhAmount,
  isAbonementExpired,
  type AbonementCard,
} from "./abonements";
import AbonementPlasticCard from "./AbonementPlasticCard";
import "./components/profile.css";
import "./abonements.css";

export default function AbonementCardPage() {
  const t = useT();
  const params = useParams<{ card_id: string }>();
  const cardId = typeof params?.card_id === "string" ? params.card_id : "";
  const [card, setCard] = useState<AbonementCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cardId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAbonementCard(cardId);
        if (!cancelled) {
          setCard(data);
          setNotFound(false);
        }
      } catch {
        if (!cancelled) {
          setCard(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <PageLayout
        title={t("profile.abonements", "Абонементы")}
        className="page--profile-edit"
      >
        <div className="profile-edit">
          <div className="app-back-bar">
            <BackButton iconOnly href="/profile/abonements" />
          </div>
          <section className="profile-card">
            <p className="profile-garage-empty">{t("common.loading", "Загрузка…")}</p>
          </section>
        </div>
      </PageLayout>
    );
  }

  if (!card || notFound) {
    return (
      <PageLayout
        title={t("profile.abonements", "Абонементы")}
        className="page--profile-edit"
      >
        <div className="profile-edit">
          <div className="app-back-bar">
            <BackButton iconOnly href="/profile/abonements" />
          </div>
          <section className="profile-card">
            <p className="profile-garage-empty">
              {t("profile.abonement_not_found", "Карта не найдена")}
            </p>
          </section>
        </div>
      </PageLayout>
    );
  }

  const expired = isAbonementExpired(card.deadline);

  return (
    <PageLayout title={card.title} className="page--profile-edit">
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile/abonements" />
        </div>

        <AbonementPlasticCard
          card={card}
          deadlineLabel={t("profile.abonement_deadline", "Действует до")}
          spentLabel={t("profile.abonement_spent", "Потрачено")}
          kwhLeftLabel={t("profile.abonement_kwh_left", "Осталось кВт·ч")}
          washLeftLabel={t("profile.abonement_wash_left", "Осталось моек")}
        />

        <section className="profile-card">
          <div className="profile-card__balance abonement-stats">
            <div className="profile-card__balance-item">
              <p className="profile-card__balance-label">
                {t("profile.abonement_deadline", "Действует до")}
              </p>
              <p
                className={`profile-card__balance-value${expired ? " is-expired" : ""}`}
              >
                {formatAbonementDeadline(card.deadline)}
                {expired
                  ? ` · ${t("profile.abonement_expired", "истёк")}`
                  : ""}
              </p>
            </div>

            {card.kind === "ev" ? (
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("profile.abonement_kwh_left", "Осталось кВт·ч")}
                </p>
                <p className="profile-card__balance-value">
                  {formatKwhAmount(card.remainingKwh ?? 0)}
                  <span className="abonement-stats__of">
                    {" "}
                    / {formatKwh(card.totalKwh ?? 0, t)}
                  </span>
                </p>
              </div>
            ) : null}

            {card.kind === "wash" ? (
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("profile.abonement_wash_left", "Осталось моек")}
                </p>
                <p className="profile-card__balance-value">
                  {card.remainingWashes ?? 0}
                  <span className="abonement-stats__of">
                    {" "}
                    / {card.totalWashes ?? 0}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="profile-card__balance-item">
              <p className="profile-card__balance-label">
                {t("profile.abonement_spent", "Потрачено")}
              </p>
              <p className="profile-card__balance-value">
                {formatAbonementUsed(card, t)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
