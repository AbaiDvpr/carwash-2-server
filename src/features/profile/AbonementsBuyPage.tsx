"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";
import { useRouter } from "next/navigation";
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

const GAP_PX = 12; // 0.75rem

function OfferPlasticCard({
  offer,
  packKwhLabel,
  packWashLabel,
  validLabel,
  priceLabel,
}: {
  offer: AbonementOffer;
  packKwhLabel: string;
  packWashLabel: string;
  validLabel: string;
  priceLabel: string;
}) {
  const hero =
    offer.kind === "ev"
      ? formatKwh(offer.totalKwh ?? 0)
      : `${offer.totalWashes ?? 0}`;
  const heroHint = offer.kind === "ev" ? packKwhLabel : packWashLabel;
  const heroUnit = offer.kind === "wash" ? "моек" : null;

  return (
    <article
      className={`abonement-plastic abonement-plastic--slide ${abonementKindClass(offer.kind)}`}
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
        {offer.totalKwh != null ? (
          <div className="abonement-plastic__progress">
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

      <div className="abonement-plastic__meta abonement-plastic__meta--slide">
        <div>
          <span className="abonement-plastic__meta-label">{validLabel}</span>
          <span className="abonement-plastic__meta-value">
            {formatValidityDays(offer.validityDays)}
          </span>
        </div>
        <div className="abonement-plastic__meta-right">
          <span className="abonement-plastic__meta-label">{priceLabel}</span>
          <span className="abonement-plastic__meta-value abonement-plastic__meta-value--price">
            {formatAbonementMoney(offer.price)}
          </span>
        </div>
      </div>
    </article>
  );
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export default function AbonementsBuyPage() {
  const t = useT();
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);

  const [offers, setOffers] = useState<AbonementOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Индекс в extended-ленте (для loop — средняя копия) */
  const [pos, setPos] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [instant, setInstant] = useState(false);
  const [step, setStep] = useState(0);
  const [pad, setPad] = useState(0);

  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const loop = offers.length > 1;
  const slides = loop ? [...offers, ...offers, ...offers] : offers;
  const activeIndex = wrapIndex(pos, offers.length);
  const active = offers[activeIndex] ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAbonementOffers();
        if (!cancelled) {
          setOffers(data);
          setError(null);
          setPos(data.length > 1 ? data.length : 0);
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

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!viewport || !first) return;
    const slideW = first.offsetWidth;
    setStep(slideW + GAP_PX);
    setPad((viewport.clientWidth - slideW) / 2);
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, offers.length, slides.length]);

  const goToPos = useCallback((next: number, withAnim = true) => {
    setInstant(!withAnim);
    setPos(next);
    if (!withAnim) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstant(false));
      });
    }
  }, []);

  const normalizeLoop = useCallback(() => {
    if (!loop || offers.length === 0) return;
    const n = offers.length;
    if (pos < n) {
      goToPos(pos + n, false);
    } else if (pos >= n * 2) {
      goToPos(pos - n, false);
    }
  }, [goToPos, loop, offers.length, pos]);

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return;
    if (e.propertyName !== "transform") return;
    normalizeLoop();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (offers.length <= 1) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    dragXRef.current = 0;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId || !dragging) return;
    const dx = e.clientX - startXRef.current;
    dragXRef.current = dx;
    setDragX(dx);
  };

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const dx = dragXRef.current;
    dragXRef.current = 0;
    setDragX(0);

    const threshold = Math.min(56, step * 0.18 || 56);
    if (dx <= -threshold) {
      goToPos(pos + 1, true);
    } else if (dx >= threshold) {
      goToPos(pos - 1, true);
    }
  }, [dragging, goToPos, pos, step]);

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    finishDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);
    dragXRef.current = 0;
    setDragX(0);
  };

  useEffect(() => {
    setBought(false);
    setBuyError(null);
  }, [activeIndex]);

  const handleBuy = async () => {
    if (!active || buying || bought) return;
    setBuying(true);
    setBuyError(null);
    try {
      const res = await buyAbonementOffer(active.id);
      setBought(true);
      window.setTimeout(() => {
        router.push(`/profile/abonements/${res.card.id}`);
      }, 600);
    } catch (err) {
      const body =
        err instanceof ApiError
          ? (err.body as { message?: string; errors?: Record<string, string[]> })
          : null;
      setBuyError(
        body?.errors?.amount?.[0] ??
          body?.errors?.offer_id?.[0] ??
          body?.message ??
          t("payment.failed", "Не удалось оплатить"),
      );
    } finally {
      setBuying(false);
    }
  };

  const tx = pad - pos * step + dragX;

  return (
    <PageLayout
      title={t("profile.buy_abonement", "Купить абонемент")}
      className="page--profile-edit"
    >
      <div className="profile-edit">
        <div className="app-back-bar">
          <BackButton iconOnly href="/profile/abonements" />
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
        ) : offers.length === 0 ? (
          <section className="profile-card">
            <p className="profile-garage-empty">
              {t("profile.abonement_offers_empty", "Нет доступных абонементов")}
            </p>
          </section>
        ) : (
          <>
            <div
              ref={viewportRef}
              className={`abonements-slider${loop ? " is-loop" : ""}`}
              role="region"
              aria-roledescription="carousel"
              aria-label={t("profile.buy_abonement", "Купить абонемент")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <div
                ref={trackRef}
                className={`abonements-slider__track${instant ? " is-instant" : ""}${dragging ? " is-dragging" : ""}`}
                style={{ transform: `translate3d(${tx}px, 0, 0)` }}
                onTransitionEnd={onTransitionEnd}
              >
                {slides.map((offer, i) => (
                  <div
                    key={`${offer.id}-${i}`}
                    className="abonements-slider__slide"
                    aria-hidden={wrapIndex(i, offers.length) !== activeIndex}
                  >
                    <OfferPlasticCard
                      offer={offer}
                      packKwhLabel={t(
                        "profile.abonement_kwh_pack",
                        "Пакет кВт·ч",
                      )}
                      packWashLabel={t(
                        "profile.abonement_wash_pack",
                        "Пакет моек",
                      )}
                      validLabel={t("profile.abonement_valid", "Срок")}
                      priceLabel={t("profile.abonement_price", "Цена")}
                    />
                  </div>
                ))}
              </div>
            </div>

            {offers.length > 1 ? (
              <div className="abonements-slider__dots" role="tablist">
                {offers.map((offer, i) => (
                  <button
                    key={offer.id}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    className={`abonements-slider__dot${i === activeIndex ? " is-active" : ""}`}
                    aria-label={offer.title}
                    onClick={() => {
                      const n = offers.length;
                      const candidates = loop ? [i, n + i, 2 * n + i] : [i];
                      let best = loop ? n + i : i;
                      let bestDist = Number.POSITIVE_INFINITY;
                      for (const c of candidates) {
                        const d = Math.abs(c - pos);
                        if (d < bestDist) {
                          bestDist = d;
                          best = c;
                        }
                      }
                      goToPos(best, true);
                    }}
                  />
                ))}
              </div>
            ) : null}

            {active ? (
              <>
                <section className="profile-card">
                  <div className="profile-card__balance abonement-stats">
                    <div className="profile-card__balance-item">
                      <p className="profile-card__balance-label">
                        {t("profile.abonement_service_type", "Тип услуги")}
                      </p>
                      <p className="profile-card__balance-value">
                        {active.kind === "ev"
                          ? t("profile.abonement_kind_ev", "ЭЗС")
                          : t("profile.abonement_kind_wash", "Мойка")}
                      </p>
                    </div>
                    <div className="profile-card__balance-item">
                      <p className="profile-card__balance-label">
                        {t("profile.abonement_pack", "Название / кол-во")}
                      </p>
                      <p className="profile-card__balance-value">
                        {active.kind === "ev"
                          ? formatKwh(active.totalKwh ?? 0)
                          : `${active.totalWashes ?? 0} ${t("profile.abonement_washes_unit", "моек")}`}
                      </p>
                    </div>
                    <div className="profile-card__balance-item">
                      <p className="profile-card__balance-label">
                        {t("profile.abonement_price", "Цена")}
                      </p>
                      <p className="profile-card__balance-value">
                        {formatAbonementMoney(active.price)}
                      </p>
                    </div>
                    <div className="profile-card__balance-item">
                      <p className="profile-card__balance-label">
                        {t("profile.abonement_valid", "Срок действия")}
                      </p>
                      <p className="profile-card__balance-value">
                        {formatValidityDays(active.validityDays)}
                      </p>
                    </div>
                  </div>
                </section>

                <div className="abonements-buy-bar">
                  {buyError ? (
                    <p className="cw-pay__hint is-danger" role="alert">
                      {buyError}
                    </p>
                  ) : null}

                  {bought ? (
                    <p className="abonements-buy-note" role="status">
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
                        : `${t("profile.buy_for", "Купить за")} ${formatAbonementMoney(active.price)}`}
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </PageLayout>
  );
}
