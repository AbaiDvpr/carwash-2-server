"use client";

import { useT } from "@/hooks/useT";
import {
  abonementKindClass,
  abonementKindSuffix,
  abonementProgress,
  formatAbonementDeadlineShort,
  formatAbonementSubtitle,
  formatAbonementUsed,
  formatKwhRange,
  isAbonementExpired,
  type AbonementCard,
} from "./abonements";
import brandIcon from "@/img/image_1787059580707.svg";

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

type AbonementPlasticCardProps = {
  card: AbonementCard;
  kwhLeftLabel: string;
  washLeftLabel: string;
  deadlineLabel: string;
  spentLabel: string;
};

/** Пластиковая карта — один формат для списка и деталки */
export default function AbonementPlasticCard({
  card,
  kwhLeftLabel,
  washLeftLabel,
  deadlineLabel,
  spentLabel,
}: AbonementPlasticCardProps) {
  const t = useT();
  const expired = isAbonementExpired(card.deadline);
  const kwhRatio = abonementProgress(card.remainingKwh ?? 0, card.totalKwh ?? 0);
  const washRatio = abonementProgress(
    card.remainingWashes ?? 0,
    card.totalWashes ?? 0,
  );

  return (
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

      <p className="abonement-plastic__label">
        {formatAbonementSubtitle(card, t)}
      </p>

      <div className="abonement-plastic__bars">
        {card.kind === "ev" ? (
          <ProgressRow
            label={kwhLeftLabel}
            valueLabel={formatKwhRange(
              card.remainingKwh ?? 0,
              card.totalKwh ?? 0,
              t,
            )}
            ratio={kwhRatio}
          />
        ) : null}
        {card.kind === "wash" ? (
          <ProgressRow
            label={washLeftLabel}
            valueLabel={`${card.remainingWashes ?? 0} / ${card.totalWashes ?? 0}`}
            ratio={washRatio}
          />
        ) : null}
      </div>

      <p className="abonement-plastic__number">{card.cardNumber}</p>

      <div className="abonement-plastic__meta">
        <div>
          <span className="abonement-plastic__meta-label">{deadlineLabel}</span>
          <span className="abonement-plastic__meta-value">
            {formatAbonementDeadlineShort(card.deadline)}
          </span>
        </div>
        <div className="abonement-plastic__meta-right">
          <span className="abonement-plastic__meta-label">{spentLabel}</span>
          <span className="abonement-plastic__meta-value">
            {formatAbonementUsed(card, t)}
          </span>
        </div>
      </div>
    </article>
  );
}
