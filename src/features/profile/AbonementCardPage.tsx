"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  abonementKindClass,
  abonementKindSuffix,
  abonementProgress,
  formatAbonementDeadline,
  formatAbonementDeadlineShort,
  formatAbonementMoney,
  formatKwh,
  getAbonementById,
  isAbonementExpired,
} from "./abonements";
import brandIcon from "@/img/image_1787059580707.svg";
import "./components/profile.css";
import "./abonements.css";

const BRAND_ICON_SRC =
  typeof brandIcon === "string" ? brandIcon : brandIcon.src;

function ProgressRow({
  label,
  valueLabel,
  ratio,
}: {
  label: string;
  valueLabel: string;
  ratio: number;
}) {
  const pct = Math.round(ratio * 100);
  return (
    <div className="abonement-plastic__progress">
      <div className="abonement-plastic__progress-head">
        <span>{label}</span>
        <strong>{valueLabel}</strong>
      </div>
      <div
        className="abonement-plastic__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <span
          className="abonement-plastic__progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AbonementCardPage() {
  const t = useT();
  const params = useParams<{ card_id: string }>();
  const cardId = typeof params?.card_id === "string" ? params.card_id : "";
  const card = useMemo(() => getAbonementById(cardId), [cardId]);

  if (!card) {
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
  const kwhRatio = abonementProgress(card.remainingKwh ?? 0, card.totalKwh ?? 0);
  const washRatio = abonementProgress(
    card.remainingWashes ?? 0,
    card.totalWashes ?? 0,
  );

  return (
    <PageLayout title={card.title} className="page--profile-edit">
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile/abonements" />
        </div>

        <article
          className={`abonement-plastic ${abonementKindClass(card.kind)}${expired ? " is-expired" : ""}`}
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

          <p className="abonement-plastic__label">{card.subtitle}</p>

          <div className="abonement-plastic__bars">
            {card.kind === "ev" || card.kind === "combo" ? (
              <ProgressRow
                label={t("profile.abonement_kwh_left", "Осталось кВт·ч")}
                valueLabel={`${formatKwh(card.remainingKwh ?? 0)} / ${formatKwh(card.totalKwh ?? 0)}`}
                ratio={kwhRatio}
              />
            ) : null}
            {card.kind === "wash" || card.kind === "combo" ? (
              <ProgressRow
                label={t("profile.abonement_wash_left", "Осталось моек")}
                valueLabel={`${card.remainingWashes ?? 0} / ${card.totalWashes ?? 0}`}
                ratio={washRatio}
              />
            ) : null}
          </div>

          <p className="abonement-plastic__number">{card.cardNumber}</p>

          <div className="abonement-plastic__meta">
            <div>
              <span className="abonement-plastic__meta-label">
                {t("profile.abonement_deadline", "Действует до")}
              </span>
              <span className="abonement-plastic__meta-value">
                {formatAbonementDeadlineShort(card.deadline)}
              </span>
            </div>
            <div className="abonement-plastic__meta-right">
              <span className="abonement-plastic__meta-label">
                {t("profile.abonement_spent", "Потрачено")}
              </span>
              <span className="abonement-plastic__meta-value">
                {formatAbonementMoney(card.spentAmount)}
              </span>
            </div>
          </div>
        </article>

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

            {card.kind === "ev" || card.kind === "combo" ? (
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("profile.abonement_kwh_left", "Осталось кВт·ч")}
                </p>
                <p className="profile-card__balance-value">
                  {formatKwh(card.remainingKwh ?? 0)}
                  <span className="abonement-stats__of">
                    {" "}
                    / {formatKwh(card.totalKwh ?? 0)}
                  </span>
                </p>
              </div>
            ) : null}

            {card.kind === "wash" || card.kind === "combo" ? (
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
                {t("profile.abonement_spent_from_card", "Потратили с этой карты")}
              </p>
              <p className="profile-card__balance-value">
                {formatAbonementMoney(card.spentAmount)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
