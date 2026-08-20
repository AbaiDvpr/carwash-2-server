"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { getStationByPaymentSlug, type Station } from "@/data/stations";
import { ApiError } from "@/lib/api";
import { fetchCwStation } from "@/lib/api/cw";
import { fetchEvStation, parseEvStationId } from "@/lib/api/ev";
import PaymentPage from "./page";
import "@/features/profile/components/profile.css";
import "./ev-charge-payment.css";

type PaymentRouteProps = {
  slug: string;
  tariff?: string | null;
};

export default function PaymentRoute({ slug, tariff = null }: PaymentRouteProps) {
  const router = useRouter();
  const evId = parseEvStationId(slug);
  const isCwLocationId = /^\d+$/.test(slug);
  const isApiStation = isCwLocationId || evId != null;

  const [station, setStation] = useState<Station | null>(
    isApiStation ? null : (getStationByPaymentSlug(slug) ?? null),
  );
  const [loading, setLoading] = useState(isApiStation);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(
    !isApiStation && !getStationByPaymentSlug(slug),
  );

  useEffect(() => {
    if (!isApiStation) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    const load =
      evId != null ? fetchEvStation(evId) : fetchCwStation(slug);

    void load
      .then((data) => {
        if (cancelled) return;
        setStation(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStation(null);
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Не удалось загрузить точку");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isApiStation, slug, evId]);

  const goHome = () => router.push("/");

  if (loading) {
    return (
      <PageLayout title="Оплата" className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <BackButton onClick={goHome}>Назад</BackButton>
          </div>
          <div className="ev-pay-skeleton">
            <div className="ev-pay-skeleton__line" />
            <div className="ev-pay-skeleton__block" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (notFound || !station) {
    return (
      <PageLayout title="Оплата" className="page--profile-edit">
        <div className="profile-edit">
          <div className="app-back-bar app-back-bar--overlay ev-pay__toolbar">
            <BackButton onClick={goHome}>Назад</BackButton>
          </div>
          <div className="profile-edit__main ev-pay-status ev-pay-status--center">
            <h1 className="ev-pay-status__title">Точка не найдена</h1>
            <p className="ev-pay-status__text">
              {error ?? "Такой точки для оплаты нет."}
            </p>
            <div className="ev-pay-status__footer">
              <button type="button" className="theme-button w-full" onClick={goHome}>
                На главную
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return <PaymentPage station={station} tariff={tariff} />;
}
