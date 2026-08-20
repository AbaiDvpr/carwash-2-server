"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import {
  abonementKindClass,
  abonementKindSuffix,
  formatAbonementMoney,
  formatKwh,
  formatValidityDays,
  getAbonementOfferById,
} from "./abonements";
import brandIcon from "@/img/image_1787059580707.svg";
import "./components/profile.css";
import "./abonements.css";

const BRAND_ICON_SRC =
  typeof brandIcon === "string" ? brandIcon : brandIcon.src;

export default function AbonementBuyOfferPage() {
  const t = useT();
  const params = useParams<{ offer_id: string }>();
  const offerId = typeof params?.offer_id === "string" ? params.offer_id : "";
  const offer = useMemo(() => getAbonementOfferById(offerId), [offerId]);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);

  if (!offer) {
    return (
      <PageLayout
        title={t("profile.buy_abonement", "Купить абонемент")}
        className="page--profile-edit"
      >
        <div className="profile-edit">
          <div className="app-back-bar">
            <BackButton iconOnly href="/profile/abonements/buy" />
          </div>
          <section className="profile-card">
            <p className="profile-garage-empty">
              {t("profile.abonement_offer_not_found", "Абонемент не найден")}
            </p>
          </section>
        </div>
      </PageLayout>
    );
  }

  const handleBuy = () => {
    if (buying || bought) return;
    setBuying(true);
    // Mock фронт — API ещё нет
    window.setTimeout(() => {
      setBuying(false);
      setBought(true);
    }, 700);
  };

  return (
    <PageLayout title={offer.title} className="page--profile-edit">
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile/abonements/buy" />
        </div>

        <article
          className={`abonement-plastic ${abonementKindClass(offer.kind)}`}
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
              <strong>{abonementKindSuffix(offer.kind)}</strong>
            </div>
          </div>

          <p className="abonement-plastic__label">{offer.subtitle}</p>

          <div className="abonement-plastic__bars">
            {offer.totalKwh != null ? (
              <div className="abonement-plastic__progress">
                <div className="abonement-plastic__progress-head">
                  <span>{t("profile.abonement_kwh_pack", "Пакет кВт·ч")}</span>
                  <strong>{formatKwh(offer.totalKwh)}</strong>
                </div>
                <div className="abonement-plastic__progress-track">
                  <span
                    className="abonement-plastic__progress-fill"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            ) : null}
            {offer.totalWashes != null ? (
              <div className="abonement-plastic__progress">
                <div className="abonement-plastic__progress-head">
                  <span>{t("profile.abonement_wash_pack", "Пакет моек")}</span>
                  <strong>{offer.totalWashes}</strong>
                </div>
                <div className="abonement-plastic__progress-track">
                  <span
                    className="abonement-plastic__progress-fill"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <p className="abonement-plastic__number">•••• •••• •••• ••••</p>

          <div className="abonement-plastic__meta">
            <div>
              <span className="abonement-plastic__meta-label">
                {t("profile.abonement_valid", "Срок")}
              </span>
              <span className="abonement-plastic__meta-value">
                {formatValidityDays(offer.validityDays)}
              </span>
            </div>
            <div className="abonement-plastic__meta-right">
              <span className="abonement-plastic__meta-label">
                {t("profile.abonement_price", "Цена")}
              </span>
              <span className="abonement-plastic__meta-value">
                {formatAbonementMoney(offer.price)}
              </span>
            </div>
          </div>
        </article>

        <section className="profile-card">
          <div className="profile-card__balance abonement-stats">
            <div className="profile-card__balance-item">
              <p className="profile-card__balance-label">
                {t("profile.abonement_price", "Цена")}
              </p>
              <p className="profile-card__balance-value">
                {formatAbonementMoney(offer.price)}
              </p>
            </div>
            <div className="profile-card__balance-item">
              <p className="profile-card__balance-label">
                {t("profile.abonement_valid", "Срок действия")}
              </p>
              <p className="profile-card__balance-value">
                {formatValidityDays(offer.validityDays)}
              </p>
            </div>
            {offer.totalKwh != null ? (
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("profile.abonement_kwh_pack", "КВт·ч в пакете")}
                </p>
                <p className="profile-card__balance-value">
                  {formatKwh(offer.totalKwh)}
                </p>
              </div>
            ) : null}
            {offer.totalWashes != null ? (
              <div className="profile-card__balance-item">
                <p className="profile-card__balance-label">
                  {t("profile.abonement_wash_pack", "Моек в пакете")}
                </p>
                <p className="profile-card__balance-value">
                  {offer.totalWashes}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {bought ? (
          <p className="abonements-buy-note theme-description" role="status">
            {t(
              "profile.abonement_buy_mock_ok",
              "Покупка пока на фронте — API подключим позже.",
            )}
          </p>
        ) : null}

        <button
          type="button"
          className="theme-button w-full abonements-buy-btn"
          onClick={handleBuy}
          disabled={buying || bought}
        >
          {bought
            ? t("profile.abonement_bought", "Куплено")
            : buying
              ? t("common.loading", "Загрузка…")
              : `${t("profile.buy_for", "Купить за")} ${formatAbonementMoney(offer.price)}`}
        </button>
      </div>
    </PageLayout>
  );
}
