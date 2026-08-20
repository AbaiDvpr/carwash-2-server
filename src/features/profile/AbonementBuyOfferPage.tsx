"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { ApiError } from "@/lib/api";
import { useT } from "@/hooks/useT";
import {
  abonementKindClass,
  abonementKindSuffix,
  buyAbonementOffer,
  fetchAbonementOffers,
  formatAbonementMoney,
  formatKwh,
  formatValidityDays,
  type AbonementOffer,
} from "./abonements";
import brandIcon from "@/img/image_1787059580707.svg";
import "./components/profile.css";
import "./abonements.css";

const BRAND_ICON_SRC =
  typeof brandIcon === "string" ? brandIcon : brandIcon.src;

export default function AbonementBuyOfferPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ offer_id: string }>();
  const offerId = typeof params?.offer_id === "string" ? params.offer_id : "";
  const [offer, setOffer] = useState<AbonementOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offers = await fetchAbonementOffers();
        if (cancelled) return;
        setOffer(offers.find((item) => item.id === offerId) ?? null);
      } catch {
        if (!cancelled) setOffer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  if (loading) {
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
            <p className="profile-garage-empty">{t("common.loading", "Загрузка…")}</p>
          </section>
        </div>
      </PageLayout>
    );
  }

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

  const handleBuy = async () => {
    if (buying || bought) return;
    setBuying(true);
    setError(null);
    try {
      const res = await buyAbonementOffer(offer.id);
      setBought(true);
      window.setTimeout(() => {
        router.push(`/profile/abonements/${res.card.id}`);
      }, 600);
    } catch (err) {
      const body =
        err instanceof ApiError
          ? (err.body as { message?: string; errors?: Record<string, string[]> })
          : null;
      setError(
        body?.errors?.amount?.[0] ??
          body?.errors?.offer_id?.[0] ??
          body?.message ??
          t("payment.failed", "Не удалось оплатить"),
      );
    } finally {
      setBuying(false);
    }
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

        {error ? (
          <p className="cw-pay__hint is-danger" role="alert">
            {error}
          </p>
        ) : null}

        {bought ? (
          <p className="abonements-buy-note theme-description" role="status">
            {t("profile.abonement_bought", "Куплено")}
          </p>
        ) : null}

        <button
          type="button"
          className="theme-button w-full abonements-buy-btn"
          onClick={() => void handleBuy()}
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
