"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_MARKER_STYLE_PREFS,
  MARKER_COLOR_PRESETS,
  MARKER_SHAPES,
  markerColorStyle,
  markerStyleClass,
  readMapMarkerStylePrefs,
  writeMapMarkerStylePrefs,
  type KindMarkerPrefs,
  type MapMarkerStylePrefs,
  type MarkerKind,
  type MarkerShapeMeta,
} from "@/features/map/markerStyles";
import { useMapSheetDrag } from "@/features/map/useMapSheetDrag";
import { useT } from "@/hooks/useT";
import { readTheme } from "@/lib/theme";
import { applyThemePalette } from "@/lib/themeColors";

type MapMarkerStyleDrawerProps = {
  prefs: MapMarkerStylePrefs;
  onApply: (prefs: MapMarkerStylePrefs) => void;
  onClose: () => void;
};

/** Пример на превью: свободно / всего — как у клиента на карте */
const PREVIEW_FREE = 2;
const PREVIEW_TOTAL = 4;
const PREVIEW_LABEL = `${PREVIEW_FREE}/${PREVIEW_TOTAL}`;
const PREVIEW_FREE_RATIO = PREVIEW_FREE / PREVIEW_TOTAL;

function PreviewMarker({
  kind,
  prefs,
  freeRatio = PREVIEW_FREE_RATIO,
}: {
  kind: MarkerKind;
  prefs: KindMarkerPrefs;
  freeRatio?: number;
}) {
  return (
    <span
      className={`${markerStyleClass(kind, prefs.shapeId)} map-marker--preview`}
      style={
        {
          "--map-marker-free": String(freeRatio),
          ...markerColorStyle(prefs),
        } as CSSProperties
      }
      aria-hidden
    >
      <span className="map-marker__progress" />
      <span className="map-marker__face">
        <span className="map-marker__icon">
          {kind === "wash" ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.2C12 2.2 5.5 9.4 5.5 13.5a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.2 12 2.2Z" />
            </svg>
          ) : (
            <svg viewBox="7 3 10 18" fill="currentColor">
              <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
            </svg>
          )}
        </span>
        <span className="map-marker__count">{PREVIEW_LABEL}</span>
      </span>
      <span className="map-marker__tip" />
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="map-marker-color-field">
      <div className="map-marker-color-field__head">
        <span className="map-marker-color-field__label">{label}</span>
        <div className="map-marker-color-field__tools">
          <span className="map-marker-color-field__hex">{value}</span>
          <label className="map-marker-color-field__picker">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onInput={(event) =>
                onChange((event.target as HTMLInputElement).value)
              }
              aria-label={label}
            />
            <span style={{ background: value }} />
          </label>
        </div>
      </div>
      <div className="map-marker-color-presets" role="list">
        {MARKER_COLOR_PRESETS.map((hex) => (
          <button
            key={`${label}-${hex}`}
            type="button"
            className={`map-marker-color-swatch${value.toLowerCase() === hex ? " is-active" : ""}`}
            style={{ background: hex }}
            onClick={() => onChange(hex)}
            aria-label={hex}
            title={hex}
          />
        ))}
      </div>
    </div>
  );
}

function ShapeGrid({
  kind,
  shapes,
  prefs,
  onSelect,
}: {
  kind: MarkerKind;
  shapes: MarkerShapeMeta[];
  prefs: KindMarkerPrefs;
  onSelect: (shapeId: number) => void;
}) {
  const t = useT();
  return (
    <div className="map-marker-style-grid">
      {shapes.map((shape) => {
        const active = shape.id === prefs.shapeId;
        return (
          <button
            key={shape.id}
            type="button"
            className={`map-marker-style-card${active ? " is-active" : ""}`}
            onClick={() => onSelect(shape.id)}
            aria-pressed={active}
          >
            <span className="map-marker-style-card__id">
              {t("map.shape_id", "Фигура")} {shape.id}
            </span>
            <span className="map-marker-style-card__preview">
              <PreviewMarker
                kind={kind}
                prefs={{ ...prefs, shapeId: shape.id }}
              />
            </span>
            <span className="map-marker-style-card__name">{shape.name}</span>
            <span className="map-marker-style-card__ratio">{PREVIEW_LABEL}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function MapMarkerStyleDrawer({
  prefs,
  onApply,
  onClose,
}: MapMarkerStyleDrawerProps) {
  const t = useT();
  const [draft, setDraft] = useState<MapMarkerStylePrefs>(prefs);
  const [tab, setTab] = useState<MarkerKind>("wash");
  const { sheetStyle, scrollProps, sheetProps, headerProps } = useMapSheetDrag({
    onClose,
    dragEnabled: false,
  });

  useEffect(() => {
    setDraft(prefs);
  }, [prefs]);

  const current = draft[tab];

  /** Сразу на карту + в localStorage (live preview). */
  const commit = (next: MapMarkerStylePrefs) => {
    setDraft(next);
    onApply(next);
    writeMapMarkerStylePrefs(next);
  };

  const patchCurrent = (patch: Partial<KindMarkerPrefs>) => {
    setDraft((prev) => {
      const next: MapMarkerStylePrefs = {
        ...prev,
        [tab]: { ...prev[tab], ...patch },
      };
      onApply(next);
      writeMapMarkerStylePrefs(next);
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        className="map-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="map-marker-style-sheet"
        role="dialog"
        aria-label={t("map.marker_styles", "Вид маркеров")}
        style={sheetStyle}
        {...sheetProps}
      >
        <div className="map-station-sheet__toolbar" {...headerProps}>
          <div className="map-conn-step__head map-conn-step__head--toolbar">
            <button
              type="button"
              className="map-conn-step__back"
              onClick={onClose}
              aria-label={t("common.back", "Назад")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="map-conn-step__title">
                {t("map.marker_styles", "Вид маркеров")}
              </h2>
              <p className="map-conn-step__parent">
                {t(
                  "map.marker_styles_hint",
                  "На маркере: свободно/всего · мойка и ЭЗС · меняется сразу",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="map-drawer__close"
            onClick={onClose}
            aria-label={t("common.close", "Закрыть")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="map-marker-style-sheet__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "wash"}
            className={`map-marker-style-sheet__tab${tab === "wash" ? " is-active" : ""}`}
            onClick={() => setTab("wash")}
          >
            <span className="map-marker-style-sheet__tab-row">
              <span
                className="map-marker-style-sheet__swatch"
                style={{ background: draft.wash.accent }}
                aria-hidden
              />
              {t("map.kind_wash", "Мойка")}
            </span>
            <span className="map-marker-style-sheet__tab-id">
              {draft.wash.accent} · {t("map.shape_id", "Фигура")}{" "}
              {draft.wash.shapeId}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "charging"}
            className={`map-marker-style-sheet__tab${tab === "charging" ? " is-active" : ""}`}
            onClick={() => setTab("charging")}
          >
            <span className="map-marker-style-sheet__tab-row">
              <span
                className="map-marker-style-sheet__swatch"
                style={{ background: draft.charging.accent }}
                aria-hidden
              />
              {t("map.kind_charging", "ЭЗС")}
            </span>
            <span className="map-marker-style-sheet__tab-id">
              {draft.charging.accent} · {t("map.shape_id", "Фигура")}{" "}
              {draft.charging.shapeId}
            </span>
          </button>
        </div>

        <div className="map-marker-style-sheet__body" {...scrollProps}>
          <section className="map-marker-colors">
            <p className="map-marker-colors__title">
              {tab === "wash"
                ? t("map.marker_colors_wash", "Цвет маркера мойки")
                : t("map.marker_colors_ev", "Цвет маркера ЭЗС")}
            </p>
            <div
              className="map-marker-colors__live"
              style={
                {
                  "--map-marker-free-color": current.progressFree,
                  "--map-marker-busy-color": current.progressBusy,
                } as CSSProperties
              }
            >
              <div className="map-marker-colors__stage">
                <PreviewMarker kind={tab} prefs={current} />
              </div>
              <div className="map-marker-ratio">
                <p className="map-marker-ratio__value" aria-hidden>
                  <span className="map-marker-ratio__free">{PREVIEW_FREE}</span>
                  <span className="map-marker-ratio__slash">/</span>
                  <span className="map-marker-ratio__total">{PREVIEW_TOTAL}</span>
                </p>
                <div className="map-marker-ratio__chips">
                  <span className="map-marker-ratio__chip map-marker-ratio__chip--free">
                    <span className="map-marker-ratio__dot" aria-hidden />
                    {t("map.free", "свободно")}
                  </span>
                  <span className="map-marker-ratio__chip map-marker-ratio__chip--total">
                    <span className="map-marker-ratio__dot" aria-hidden />
                    {t("map.total_slots", "всего")}
                  </span>
                </div>
                <p className="map-marker-ratio__hint">
                  {tab === "wash"
                    ? t(
                        "map.marker_ratio_hint_wash",
                        "Клиент сразу видит свободные посты мойки",
                      )
                    : t(
                        "map.marker_ratio_hint_ev",
                        "Клиент сразу видит свободные слоты ЭЗС",
                      )}
                </p>
              </div>
            </div>
            <ColorField
              label={t("map.marker_accent", "Основной цвет")}
              value={current.accent}
              onChange={(accent) => patchCurrent({ accent })}
            />
            <ColorField
              label={t("map.marker_ink", "Цвет текста")}
              value={current.ink}
              onChange={(ink) => patchCurrent({ ink })}
            />
            <ColorField
              label={t("map.marker_free", "Свободно (кольцо)")}
              value={current.progressFree}
              onChange={(progressFree) => patchCurrent({ progressFree })}
            />
            <ColorField
              label={t("map.marker_busy", "Занято (кольцо)")}
              value={current.progressBusy}
              onChange={(progressBusy) => patchCurrent({ progressBusy })}
            />
          </section>

          <p className="map-marker-colors__title">
            {t("map.marker_shapes", "Фигуры")}
          </p>
          <ShapeGrid
            kind={tab}
            shapes={MARKER_SHAPES}
            prefs={current}
            onSelect={(shapeId) => patchCurrent({ shapeId })}
          />
        </div>

        <div className="map-marker-style-sheet__footer">
          <button
            type="button"
            className="map-filter-sheet__reset"
            onClick={() => commit(structuredClone(DEFAULT_MARKER_STYLE_PREFS))}
          >
            {t("map.filter_reset_tab", "Сбросить")}
          </button>
          <button
            type="button"
            className="map-filter-sheet__apply"
            onClick={onClose}
          >
            {t("common.done", "Готово")}
          </button>
        </div>
      </div>
    </>
  );
}

export function useMapMarkerStylePrefs() {
  const [prefs, setPrefs] = useState<MapMarkerStylePrefs>(() =>
    structuredClone(DEFAULT_MARKER_STYLE_PREFS),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Не трогаем --map-wash / --map-charging (это тема UI).
    // Только восстанавливаем палитру темы, если раньше её перетёрли.
    applyThemePalette(readTheme());
    setPrefs(readMapMarkerStylePrefs());
    setReady(true);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<MapMarkerStylePrefs>).detail;
      if (detail) setPrefs(detail);
      else setPrefs(readMapMarkerStylePrefs());
    };
    window.addEventListener("map-marker-styles-changed", onChange);
    return () =>
      window.removeEventListener("map-marker-styles-changed", onChange);
  }, []);

  return { prefs, setPrefs, ready };
}
