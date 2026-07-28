export const THEME_LAYOUT_STORAGE_KEY = "theme_layout";
export const THEME_LAYOUT_CHANGE_EVENT = "carwash-theme-layout-change";

export type LayoutUnit = "rem" | "px" | "";

/** Отступы / радиусы / gap / типографика — общие для light и dark. */
export type ThemeLayout = {
  pagePadX: string;
  pagePadTop: string;
  pagePadBottom: string;
  rowPadX: string;
  rowPadY: string;
  rowGap: string;
  stackGap: string;
  sectionRadius: string;
  sectionRadiusSm: string;
  buttonRadius: string;
  buttonPadX: string;
  buttonPadY: string;
  borderWidth: string;
  fontSize: string;
  lineHeight: string;
};

export const DEFAULT_LAYOUT: ThemeLayout = {
  pagePadX: "1rem",
  pagePadTop: "0.25rem",
  pagePadBottom: "2rem",
  rowPadX: "1rem",
  rowPadY: "0.75rem",
  rowGap: "0.75rem",
  stackGap: "1rem",
  sectionRadius: "1rem",
  sectionRadiusSm: "0.75rem",
  buttonRadius: "0.5rem",
  buttonPadX: "0.75rem",
  buttonPadY: "0.5rem",
  borderWidth: "1px",
  fontSize: "14px",
  lineHeight: "1.45",
};

export const LAYOUT_FIELD_META: {
  key: keyof ThemeLayout;
  label: string;
  hint: string;
  cssVar: string;
  uses: string;
  unit: LayoutUnit;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "pagePadX",
    label: "Page pad X",
    hint: "Боковые отступы страницы",
    cssVar: "--app-page-pad-x",
    uses: ".page-content, map sheets",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "pagePadTop",
    label: "Page pad top",
    hint: "Верхний отступ страницы",
    cssVar: "--app-page-pad-top",
    uses: ".page-content",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "pagePadBottom",
    label: "Page pad bottom",
    hint: "Нижний отступ страницы",
    cssVar: "--app-page-pad-bottom",
    uses: ".page-content",
    unit: "rem",
    min: 0,
    max: 4,
    step: 0.05,
  },
  {
    key: "rowPadX",
    label: "Row pad X",
    hint: "Боковые отступы строк",
    cssVar: "--app-row-pad-x",
    uses: ".app-row, карточки, списки",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "rowPadY",
    label: "Row pad Y",
    hint: "Вертикальные отступы строк",
    cssVar: "--app-row-pad-y",
    uses: ".app-row, внутренние блоки",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "rowGap",
    label: "Row gap",
    hint: "Зазор внутри строки (иконка ↔ текст)",
    cssVar: "--app-row-gap",
    uses: ".app-row",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "stackGap",
    label: "Stack gap",
    hint: "Зазор между секциями",
    cssVar: "--app-stack-gap",
    uses: ".app-stack",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "sectionRadius",
    label: "Section radius",
    hint: "Скругление секций",
    cssVar: "--app-section-radius",
    uses: ".app-section, drawers",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "sectionRadiusSm",
    label: "Section radius sm",
    hint: "Малое скругление",
    cssVar: "--app-section-radius-sm",
    uses: ".app-section--sm",
    unit: "rem",
    min: 0,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "buttonRadius",
    label: "Button radius",
    hint: "Скругление кнопок",
    cssVar: "--app-button-radius",
    uses: ".theme-button",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "buttonPadX",
    label: "Button pad X",
    hint: "Горизонтальный паддинг кнопки",
    cssVar: "--app-button-pad-x",
    uses: ".theme-button",
    unit: "rem",
    min: 0.25,
    max: 2,
    step: 0.05,
  },
  {
    key: "buttonPadY",
    label: "Button pad Y",
    hint: "Вертикальный паддинг кнопки",
    cssVar: "--app-button-pad-y",
    uses: ".theme-button",
    unit: "rem",
    min: 0.25,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "borderWidth",
    label: "Border width",
    hint: "Толщина рамок",
    cssVar: "--app-border-width",
    uses: ".app-section, .app-row+",
    unit: "px",
    min: 0,
    max: 4,
    step: 0.5,
  },
  {
    key: "fontSize",
    label: "Font size",
    hint: "Базовый размер шрифта",
    cssVar: "--app-font-size",
    uses: "body",
    unit: "px",
    min: 12,
    max: 18,
    step: 1,
  },
  {
    key: "lineHeight",
    label: "Line height",
    hint: "Межстрочный интервал",
    cssVar: "--app-line-height",
    uses: "body",
    unit: "",
    min: 1.2,
    max: 1.8,
    step: 0.05,
  },
];

const META_BY_KEY = Object.fromEntries(
  LAYOUT_FIELD_META.map((f) => [f.key, f]),
) as Record<keyof ThemeLayout, (typeof LAYOUT_FIELD_META)[number]>;

export function parseLayoutNumber(value: string): number {
  const n = Number.parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatLayoutValue(value: number, unit: LayoutUnit): string {
  const n = Math.round(value * 100) / 100;
  return unit ? `${n}${unit}` : String(n);
}

/** @deprecated используй parseLayoutNumber */
export function remToNumber(value: string): number {
  return parseLayoutNumber(value);
}

/** @deprecated используй formatLayoutValue(..., "rem") */
export function numberToRem(value: number): string {
  return formatLayoutValue(value, "rem");
}

function normalizeLayoutValue(
  value: unknown,
  fallback: string,
  unit: LayoutUnit,
): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatLayoutValue(value, unit);
  }
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (unit === "rem" && /^(\d*\.?\d+)\s*rem$/i.test(trimmed)) {
    return formatLayoutValue(parseLayoutNumber(trimmed), "rem");
  }
  if (unit === "px" && /^(\d*\.?\d+)\s*px$/i.test(trimmed)) {
    return formatLayoutValue(parseLayoutNumber(trimmed), "px");
  }
  if (unit === "" && /^\d*\.?\d+$/.test(trimmed)) {
    return formatLayoutValue(parseLayoutNumber(trimmed), "");
  }
  if (/^\d*\.?\d+$/.test(trimmed)) {
    return formatLayoutValue(parseLayoutNumber(trimmed), unit);
  }
  return fallback;
}

export function normalizeLayout(raw: unknown): ThemeLayout {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_LAYOUT };
  const obj = raw as Partial<ThemeLayout>;
  const next = { ...DEFAULT_LAYOUT };

  (Object.keys(DEFAULT_LAYOUT) as (keyof ThemeLayout)[]).forEach((key) => {
    const meta = META_BY_KEY[key];
    next[key] = normalizeLayoutValue(obj[key], DEFAULT_LAYOUT[key], meta.unit);
  });

  return next;
}

export function readThemeLayout(): ThemeLayout {
  if (typeof window === "undefined") return { ...DEFAULT_LAYOUT };

  try {
    const raw = window.localStorage.getItem(THEME_LAYOUT_STORAGE_KEY);
    if (raw) return normalizeLayout(JSON.parse(raw) as unknown);
  } catch {
    // ignore
  }

  return { ...DEFAULT_LAYOUT };
}

export function writeThemeLayout(layout: ThemeLayout): ThemeLayout {
  const next = normalizeLayout(layout);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_LAYOUT_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(THEME_LAYOUT_CHANGE_EVENT, { detail: next }),
    );
  }

  return next;
}

export function setThemeLayoutField(
  field: keyof ThemeLayout,
  value: string,
): ThemeLayout {
  const current = readThemeLayout();
  const meta = META_BY_KEY[field];
  return writeThemeLayout({
    ...current,
    [field]: normalizeLayoutValue(value, current[field], meta.unit),
  });
}

export function resetThemeLayout(): ThemeLayout {
  return writeThemeLayout({ ...DEFAULT_LAYOUT });
}

export function applyThemeLayout(layout: ThemeLayout = readThemeLayout()): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--app-page-pad-x", layout.pagePadX);
  root.style.setProperty("--app-page-pad-top", layout.pagePadTop);
  root.style.setProperty("--app-page-pad-bottom", layout.pagePadBottom);
  root.style.setProperty("--app-row-pad-x", layout.rowPadX);
  root.style.setProperty("--app-row-pad-y", layout.rowPadY);
  root.style.setProperty("--app-row-gap", layout.rowGap);
  root.style.setProperty("--app-stack-gap", layout.stackGap);
  root.style.setProperty("--app-section-radius", layout.sectionRadius);
  root.style.setProperty("--app-section-radius-sm", layout.sectionRadiusSm);
  root.style.setProperty("--app-button-radius", layout.buttonRadius);
  root.style.setProperty("--app-button-pad-x", layout.buttonPadX);
  root.style.setProperty("--app-button-pad-y", layout.buttonPadY);
  root.style.setProperty("--app-border-width", layout.borderWidth);
  root.style.setProperty("--app-font-size", layout.fontSize);
  root.style.setProperty("--app-line-height", layout.lineHeight);
}
