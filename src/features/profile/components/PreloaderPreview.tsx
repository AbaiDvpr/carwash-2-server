"use client";

import PreloaderStage from "./PreloaderStage";
import {
  PRELOADER_GROUPS,
  PRELOADER_VARIANTS,
  preloaderVariantsByCategory,
  type PreloaderCategory,
} from "./preloaderVariants";
import { DEFAULT_PRELOADER_VARIANT } from "@/lib/preloaderVariant";
import { usePreloaderVariant } from "@/hooks/usePreloaderVariant";
import "./preloader-preview.css";

function stageClass(category: PreloaderCategory) {
  const base = "preloader-preview__stage";
  if (category === "circle" || category === "combo") {
    return `${base} preloader-preview__stage--round`;
  }
  return `${base} preloader-preview__stage--plain`;
}

export default function PreloaderPreview() {
  const { variant: active, setVariant, resetToDefault, isDefault, mounted } =
    usePreloaderVariant();
  const current = isDefault
    ? PRELOADER_VARIANTS.find((item) => item.id === DEFAULT_PRELOADER_VARIANT)
    : PRELOADER_VARIANTS.find((item) => item.id === active);
  const defaultMeta = PRELOADER_VARIANTS.find(
    (item) => item.id === DEFAULT_PRELOADER_VARIANT,
  );
  const showDefaultCircleIcon = !(isDefault && active.startsWith("circle-"));

  return (
    <>
      <div className="preloader-preview__hero">
        {mounted ? (
          <PreloaderStage
            variant={active}
            size={140}
            showCircleIcon={showDefaultCircleIcon}
          />
        ) : null}
      </div>

      <section className="profile-card preloader-preview__section preloader-preview__section--default">
        <div className="preloader-preview__section-head">
          <p className="preloader-preview__section-title">Стандартный прелоадер</p>
          <p className="preloader-preview__section-desc">
            Классический круглый спиннер — без иконки, как при первом запуске
          </p>
        </div>
        <button
          type="button"
          className={`preloader-preview__item preloader-preview__item--default theme-hover${isDefault ? " is-on" : ""}`}
          aria-pressed={isDefault}
          onClick={resetToDefault}
        >
          <span className="preloader-preview__stage preloader-preview__stage--round">
            {mounted ? (
              <PreloaderStage
                variant={DEFAULT_PRELOADER_VARIANT}
                size={72}
                showCircleIcon={false}
              />
            ) : null}
          </span>
          <span className="preloader-preview__meta">
            <span className="preloader-preview__label">По умолчанию</span>
            <span className="preloader-preview__hint">
              {defaultMeta?.label.replace(/^\d+ · /, "") ?? "Круг · вращение"} · без иконки
            </span>
          </span>
        </button>
      </section>

      {PRELOADER_GROUPS.map((group) => (
        <section key={group.category} className="profile-card preloader-preview__section">
          <div className="preloader-preview__section-head">
            <p className="preloader-preview__section-title">{group.title}</p>
            <p className="preloader-preview__section-desc">{group.description}</p>
          </div>
          <div className="preloader-preview__grid">
            {preloaderVariantsByCategory(group.category).map((item) => {
              const selected = !isDefault && active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`preloader-preview__item theme-hover${selected ? " is-on" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setVariant(item.id)}
                >
                  <span className={stageClass(group.category)}>
                    <PreloaderStage variant={item.id} size={72} />
                  </span>
                  <span className="preloader-preview__meta">
                    <span className="preloader-preview__label">{item.label}</span>
                    <span className="preloader-preview__hint">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {current ? (
        <p className="preloader-preview__note">
          {isDefault
            ? "Стандартный: круглый спиннер без иконки. Свой вариант можно выбрать ниже — сохранится после рефреша."
            : `Выбран: ${current.label}. Сохраняется и показывается при загрузке / рефреше.`}
        </p>
      ) : null}
    </>
  );
}
