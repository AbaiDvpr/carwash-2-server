"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import { fetchAbonementCards, type AbonementCard } from "./abonements";
import AbonementPlasticCard from "./AbonementPlasticCard";
import "./components/profile.css";
import "./abonements.css";

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
                <AbonementPlasticCard
                  card={card}
                  deadlineLabel={t("profile.abonement_deadline", "Действует до")}
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
