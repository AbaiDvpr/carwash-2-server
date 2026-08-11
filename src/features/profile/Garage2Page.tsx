"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import "./components/profile.css";

type PowerType = "fuel" | "electric";

const COLORS = [
  { id: "white", hex: "#f4f4f5", label: "Белый" },
  { id: "silver", hex: "#a1a1aa", label: "Серебристый" },
  { id: "black", hex: "#18181b", label: "Чёрный" },
  { id: "blue", hex: "#2563eb", label: "Синий" },
  { id: "purple", hex: "#7c3aed", label: "Фиолетовый" },
  { id: "red", hex: "#dc2626", label: "Красный" },
] as const;

function IconCarSide() {
  return (
    <svg viewBox="0 0 120 48" fill="none" aria-hidden>
      <path
        d="M14 34h6.5l4-10h48l8 10H98c3 0 5 2 5 4.5V40H10v-1.5C10 36 12 34 14 34Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M28 24h40l-3.5-9.5A4 4 0 0 0 60.8 12H36.5a4 4 0 0 0-3.8 2.6L28 24Z"
        fill="currentColor"
        opacity="0.55"
      />
      <circle cx="30" cy="38" r="5.5" fill="currentColor" opacity="0.35" />
      <circle cx="84" cy="38" r="5.5" fill="currentColor" opacity="0.35" />
      <circle cx="30" cy="38" r="2.4" fill="currentColor" opacity="0.7" />
      <circle cx="84" cy="38" r="2.4" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function IconFuel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20.5V6.5A1.5 1.5 0 0 1 7 5h7.5A1.5 1.5 0 0 1 16 6.5v14" />
      <path strokeLinecap="round" d="M5.5 20.5h12.5M8 8.5h5.5M16 10.5h1.8a1.7 1.7 0 0 1 1.7 1.7V16a1.5 1.5 0 0 0 1.5 1.5" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3.5 6.5 13.5H12l-1 7 6.5-10H12L13 3.5Z" />
    </svg>
  );
}

function IconTransport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5h16l-1.2-4.2A2 2 0 0 0 16.9 10H7.1a2 2 0 0 0-1.9 1.3L4 15.5Z" />
      <path strokeLinecap="round" d="M6.5 15.5v2M17.5 15.5v2M7.5 10l1-3h7l1 3" />
      <circle cx="7.5" cy="17.5" r="1.25" />
      <circle cx="16.5" cy="17.5" r="1.25" />
    </svg>
  );
}

export default function Garage2Page() {
  const t = useT();
  const [colorId, setColorId] = useState<(typeof COLORS)[number]["id"]>("black");
  const [powerType, setPowerType] = useState<PowerType | null>(null);
  const [plate, setPlate] = useState("");

  const color = COLORS.find((item) => item.id === colorId) ?? COLORS[2];
  const canSubmit = plate.trim().length >= 3 && powerType != null;

  return (
    <PageLayout title={t("profile.garage2", "Гараж 2")} className="page--profile-edit">
      <div className="profile-edit garage2">
        <div className="mb-3">
          <BackButton iconOnly href="/profile" />
        </div>

        <div className="garage2__hero">
          <div className="garage2__car" style={{ color: color.hex }}>
            <IconCarSide />
          </div>
          <div className="garage2__plate">
            <span className="garage2__flag" aria-hidden>
              🇰🇿
            </span>
            <input
              type="text"
              inputMode="text"
              value={plate}
              onChange={(e) =>
                setPlate(
                  e.target.value.replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, 12),
                )
              }
              placeholder="111 AAA 11"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label={t("garage.plate", "Госномер")}
              className="garage2__plate-input"
            />
          </div>
          <p className="garage2__hint">
            {t(
              "garage2.plate_hint",
              "Введите государственный номер транспортного средства",
            )}
          </p>
        </div>

        <div className="garage2__colors">
          <p className="garage2__color-label">{color.label}</p>
          <div className="garage2__swatches" role="listbox" aria-label={t("garage2.color", "Цвет")}>
            {COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={colorId === item.id}
                aria-label={item.label}
                onClick={() => setColorId(item.id)}
                className={`garage2__swatch${colorId === item.id ? " is-active" : ""}`}
                style={{ background: item.hex }}
              />
            ))}
          </div>
        </div>

        <section className="profile-card garage2__card">
          <div className="profile-nav-row is-static">
            <span className="profile-nav-row__icon" aria-hidden>
              <IconTransport />
            </span>
            <span className="profile-nav-row__main">
              <span className="profile-nav-row__label">
                {t("garage2.transport", "Транспорт")}
              </span>
              <span className="profile-nav-row__hint">
                {t("garage2.model_placeholder", "Модель авто")}
              </span>
            </span>
          </div>
        </section>

        <section className="profile-card garage2__card">
          <p className="garage2__section-label">
            {t("garage2.power_title", "Тип питания")}
          </p>
          <div className="garage2__power" role="radiogroup" aria-label={t("garage2.power_title", "Тип питания")}>
            <button
              type="button"
              role="radio"
              aria-checked={powerType === "fuel"}
              onClick={() => setPowerType("fuel")}
              className={`garage2__power-btn${powerType === "fuel" ? " is-active" : ""}`}
            >
              <span className="garage2__power-icon" aria-hidden>
                <IconFuel />
              </span>
              <span className="garage2__power-text">
                <span className="garage2__power-title">
                  {t("garage2.fuel", "Топливо")}
                </span>
                <span className="garage2__power-hint">
                  {t("garage2.fuel_hint", "Бензин, дизель, газ")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={powerType === "electric"}
              onClick={() => setPowerType("electric")}
              className={`garage2__power-btn${powerType === "electric" ? " is-active" : ""}`}
            >
              <span className="garage2__power-icon" aria-hidden>
                <IconBolt />
              </span>
              <span className="garage2__power-text">
                <span className="garage2__power-title">
                  {t("garage2.electric", "Электро")}
                </span>
                <span className="garage2__power-hint">
                  {t("garage2.electric_hint", "Электромобиль")}
                </span>
              </span>
            </button>
          </div>
        </section>

        <button type="button" disabled={!canSubmit} className="theme-button w-full">
          {t("common.done", "Готово")}
        </button>
      </div>
    </PageLayout>
  );
}
