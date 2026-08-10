"use client";

import { useEffect, useState, type CSSProperties } from "react";
import MarkerFaceContent from "@/features/map/MarkerFaceContent";
import MarkerProgress from "@/features/map/MarkerProgress";
import {
  DEFAULT_MARKER_FACE_LAYOUT,
  DEFAULT_MARKER_STYLE_PREFS,
  MARKER_COLOR_PRESETS,
  MARKER_FACE_PART_META,
  MARKER_SHAPES,
  addMarkerFacePart,
  markerColorStyle,
  markerStyleClass,
  moveMarkerFacePart,
  normalizeMarkerFaceLayout,
  removeMarkerFacePartAt,
  readMapMarkerStylePrefs,
  writeMapMarkerStylePrefs,
  type KindMarkerPrefs,
  type MapMarkerStylePrefs,
  type MarkerFaceLayout,
  type MarkerFacePart,
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

/** Пример на превью: только свободные */
const PREVIEW_FREE = 2;

function partLabel(part: MarkerFacePart, t: (k: string, f: string) => string): string {
  switch (part) {
    case "icon":
      return t("map.part_icon", "Иконка");
    case "free":
      return t("map.part_free", "Свободно");
    default:
      return part;
  }
}

function PreviewMarker({
  kind,
  prefs,
  free = PREVIEW_FREE,
}: {
  kind: MarkerKind;
  prefs: KindMarkerPrefs;
  free?: number;
}) {
  return (
    <span
      className={`${markerStyleClass(kind, prefs.shapeId)} map-marker--preview`}
      style={markerColorStyle(prefs) as CSSProperties}
      aria-hidden
    >
      <MarkerProgress />
      <span className="map-marker__face">
        <MarkerFaceContent kind={kind} prefs={prefs} free={free} total={0} />
      </span>
      <span className="map-marker__tip" />
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
  mark,
  markHint,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Цифра в маркере (2 / 4), к которой привязан цвет */
  mark?: number | string;
  markHint?: string;
}) {
  return (
    <div className="map-marker-color-field">
      <div className="map-marker-color-field__head">
        <span className="map-marker-color-field__label">
              {mark != null ? (
            <span
              className="map-marker-color-field__mark"
              style={{ color: "var(--app-text)" }}
              title={markHint}
            >
              <span
                className="map-marker-color-field__mark-swatch"
                style={{ background: value }}
                aria-hidden
              />
              {mark}
            </span>
          ) : null}
          <span className="map-marker-color-field__label-text">
            {label}
            {markHint ? (
              <span className="map-marker-color-field__mark-hint">{markHint}</span>
            ) : null}
          </span>
        </span>
        <div className="map-marker-color-field__tools">
          <span className="map-marker-color-field__hex">{value}</span>
          <label className="map-marker-color-field__picker">
            <span style={{ background: value }} aria-hidden />
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#38bdf8"}
              onChange={(event) => onChange(event.target.value.toLowerCase())}
              onInput={(event) =>
                onChange(
                  (event.target as HTMLInputElement).value.toLowerCase(),
                )
              }
              aria-label={label}
            />
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
          </button>
        );
      })}
    </div>
  );
}

function LayoutConstructor({
  layout,
  onChange,
}: {
  layout: MarkerFaceLayout;
  onChange: (layout: MarkerFaceLayout) => void;
}) {
  const t = useT();
  const normalized = normalizeMarkerFaceLayout(layout);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected == null) return;
    if (selected >= normalized.parts.length) {
      setSelected(normalized.parts.length > 0 ? normalized.parts.length - 1 : null);
    }
  }, [normalized.parts.length, selected]);

  const patch = (partial: Partial<MarkerFaceLayout>) => {
    onChange(normalizeMarkerFaceLayout({ ...normalized, ...partial }));
  };

  return (
    <section className="map-marker-layout">
      <p className="map-marker-colors__title">
        {t("map.marker_layout", "Конструктор содержимого")}
      </p>
      <p className="map-marker-layout__hint">
        {t(
          "map.marker_layout_hint",
          "На точке только иконка и свободные. Порядок блоков можно поменять.",
        )}
      </p>

      <div className="map-marker-layout__strip" role="list">
        {normalized.parts.map((part, index) => {
          const active = selected === index;
          const sample = part === "free" ? PREVIEW_FREE : null;
          return (
            <button
              key={`${part}-${index}`}
              type="button"
              role="listitem"
              className={`map-marker-layout__chip${active ? " is-active" : ""}${part === "free" ? " is-free" : ""}`}
              onClick={() => setSelected(index)}
              aria-pressed={active}
            >
              {sample != null ? (
                <span className="map-marker-layout__chip-sample">{sample}</span>
              ) : (
                partLabel(part, t)
              )}
              {sample != null ? (
                <span className="map-marker-layout__chip-caption">
                  {partLabel(part, t)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="map-marker-layout__actions">
        <button
          type="button"
          className="map-marker-layout__btn"
          disabled={selected == null || selected <= 0}
          onClick={() => {
            if (selected == null) return;
            onChange(moveMarkerFacePart(normalized, selected, -1));
            setSelected(selected - 1);
          }}
        >
          ←
        </button>
        <button
          type="button"
          className="map-marker-layout__btn"
          disabled={
            selected == null || selected >= normalized.parts.length - 1
          }
          onClick={() => {
            if (selected == null) return;
            onChange(moveMarkerFacePart(normalized, selected, 1));
            setSelected(selected + 1);
          }}
        >
          →
        </button>
        <button
          type="button"
          className="map-marker-layout__btn map-marker-layout__btn--danger"
          disabled={
            selected == null ||
            normalized.parts.length <= 1 ||
            normalized.parts[selected] === "free"
          }
          onClick={() => {
            if (selected == null) return;
            onChange(removeMarkerFacePartAt(normalized, selected));
            setSelected(null);
          }}
        >
          {t("common.delete", "Удалить")}
        </button>
      </div>

      <div className="map-marker-layout__add">
        <span className="map-marker-layout__add-label">
          {t("map.marker_add_part", "Добавить блок")}
        </span>
        <div className="map-marker-layout__add-row">
          {MARKER_FACE_PART_META.map((meta) => {
            const disabled =
              meta.once && normalized.parts.includes(meta.id);
            return (
              <button
                key={meta.id}
                type="button"
                className="map-marker-layout__add-btn"
                disabled={disabled}
                onClick={() => {
                  const next = addMarkerFacePart(normalized, meta.id);
                  onChange(next);
                  setSelected(next.parts.length - 1);
                }}
              >
                {partLabel(meta.id, t)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="map-marker-layout__slider">
        <span>
          {t("map.marker_gap", "Отступ (gap)")}
          <strong>{normalized.gap.toFixed(2)} rem</strong>
        </span>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.02}
          value={normalized.gap}
          onChange={(e) => patch({ gap: Number(e.target.value) })}
        />
      </label>

      <button
        type="button"
        className="map-marker-layout__reset"
        onClick={() => {
          onChange(structuredClone(DEFAULT_MARKER_FACE_LAYOUT));
          setSelected(null);
        }}
      >
        {t("map.marker_layout_reset", "Сбросить раскладку")}
      </button>
    </section>
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

  const current = {
    ...draft[tab],
    layout: normalizeMarkerFaceLayout(draft[tab]?.layout),
  };

  /** Сразу на карту + в localStorage (live preview). */
  const commit = (next: MapMarkerStylePrefs) => {
    setDraft(next);
    onApply(next);
    writeMapMarkerStylePrefs(next);
  };

  const patchCurrent = (patch: Partial<KindMarkerPrefs>) => {
    setDraft((prev) => {
      const base = prev[tab] ?? DEFAULT_MARKER_STYLE_PREFS[tab];
      const next: MapMarkerStylePrefs = {
        ...prev,
        [tab]: {
          ...base,
          ...patch,
          layout: normalizeMarkerFaceLayout(patch.layout ?? base.layout),
        },
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
                  "Конструктор, цвета и фигуры. Меняется сразу на карте",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="app-drawer-close"
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
            <div className="map-marker-style-sheet__tab-id">
              <span>{draft.wash.accent}</span>
              <div className="map-marker-style-sheet__tab-sep" aria-hidden />
              <span>
                {t("map.shape_id", "Фигура")} {draft.wash.shapeId}
              </span>
            </div>
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
            <div className="map-marker-style-sheet__tab-id">
              <span>{draft.charging.accent}</span>
              <div className="map-marker-style-sheet__tab-sep" aria-hidden />
              <span>
                {t("map.shape_id", "Фигура")} {draft.charging.shapeId}
              </span>
            </div>
          </button>
        </div>

        <div className="map-marker-style-sheet__body" {...scrollProps}>
          <section className="map-marker-colors">
            <p className="map-marker-colors__title">
              {tab === "wash"
                ? t("map.marker_colors_wash", "Цвет маркера мойки")
                : t("map.marker_colors_ev", "Цвет маркера ЭЗС")}
            </p>
            <div className="map-marker-colors__live">
              <div className="map-marker-colors__stage">
                <PreviewMarker kind={tab} prefs={current} />
              </div>
              <div className="map-marker-ratio">
                <p className="map-marker-ratio__hint">
                  {t(
                    "map.marker_ratio_legend",
                    "Обводка точки белая. На маркере только свободные — без «/» и без всего.",
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

            <div
              className="map-marker-cluster-preview"
              style={
                {
                  "--cluster-wash": draft.wash.accent,
                  "--cluster-wash-ink": draft.wash.ink,
                  "--cluster-charging": draft.charging.accent,
                  "--cluster-charging-ink": draft.charging.ink,
                } as CSSProperties
              }
            >
              <p className="map-marker-colors__title">
                {t("map.marker_cluster_title", "Группировка на карте")}
              </p>
              <p className="map-marker-ratio__hint">
                {t(
                  "map.marker_cluster_hint",
                  "Группировка — пилюля с треугольником: число = свободные посты/пистолеты (не станции).",
                )}
              </p>
              <div className="map-marker-cluster-preview__row" aria-hidden>
                <span className="map-cluster map-cluster--pill map-cluster--wash">
                  <span className="map-cluster__solo">
                    <span className="map-cluster__num">5</span>
                  </span>
                  <span className="map-cluster__tip" />
                </span>
                <span className="map-cluster map-cluster--pill map-cluster--charging">
                  <span className="map-cluster__solo">
                    <span className="map-cluster__num">3</span>
                  </span>
                  <span className="map-cluster__tip" />
                </span>
                <span className="map-cluster map-cluster--pill map-cluster--mixed">
                  <span className="map-cluster__half map-cluster__half--wash">
                    <span className="map-cluster__num">2</span>
                  </span>
                  <span className="map-cluster__half map-cluster__half--charging">
                    <span className="map-cluster__num">4</span>
                  </span>
                  <span className="map-cluster__tip" />
                </span>
              </div>
            </div>
          </section>

          <LayoutConstructor
            layout={current.layout}
            onChange={(layout) => patchCurrent({ layout })}
          />

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
