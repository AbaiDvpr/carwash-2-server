export const THEME_LAYOUT_STORAGE_KEY = "theme_layout";
export const THEME_LAYOUT_CHANGE_EVENT = "carwash-theme-layout-change";

export type LayoutUnit = "rem" | "px" | "";

export type LayoutFieldGroup =
  | "page"
  | "row"
  | "radius"
  | "button"
  | "border"
  | "text";

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
  fontSize: "0.9375rem",
  lineHeight: "1.45",
};

export const LAYOUT_GROUP_LABELS: Record<LayoutFieldGroup, string> = {
  page: "Страница",
  row: "Боковые пункты",
  radius: "Скругления",
  button: "Кнопки",
  border: "Рамки",
  text: "Текст",
};

/** Кратко: зачем раздел в меню Оформления */
export const LAYOUT_GROUP_HINTS: Record<LayoutFieldGroup, string> = {
  page: "Поля экрана слева/справа/сверху/снизу",
  row: "Отступы пунктов меню и строк в списках",
  radius: "Скругление карточек и sheet",
  button: "Форма и padding кнопок",
  border: "Толщина линий у блоков",
  text: "Базовый rem и межстрочный интервал",
};

export const LAYOUT_FIELD_META: {
  key: keyof ThemeLayout;
  group: LayoutFieldGroup;
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
    group: "page",
    label: "Отступ страницы слева/справа",
    hint: "Горизонтальные поля контента",
    cssVar: "--app-page-pad-x",
    uses: "Профиль, история, чат, настройки; боковые поля у нижних sheet на карте",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "pagePadTop",
    group: "page",
    label: "Отступ страницы сверху",
    hint: "Верхнее поле контента",
    cssVar: "--app-page-pad-top",
    uses: "Все страницы с .page-content (профиль, история, настройки…)",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "pagePadBottom",
    group: "page",
    label: "Отступ страницы снизу",
    hint: "Нижнее поле контента (над навбаром)",
    cssVar: "--app-page-pad-bottom",
    uses: "Все страницы с .page-content; запас снизу у длинных экранов",
    unit: "rem",
    min: 0,
    max: 4,
    step: 0.05,
  },
  {
    key: "rowPadX",
    group: "row",
    label: "Пункт: отступ слева/справа",
    hint: "Внутри бокового пункта / строки меню",
    cssVar: "--app-row-pad-x",
    uses: "Пункты профиля (Оформление, Язык…), списки, .app-row",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "rowPadY",
    group: "row",
    label: "Пункт: отступ сверху/снизу",
    hint: "Высота «воздуха» в боковом пункте",
    cssVar: "--app-row-pad-y",
    uses: "Пункты профиля, списки, .app-row",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "rowGap",
    group: "row",
    label: "Пункт: зазор иконка ↔ текст",
    hint: "Расстояние между иконкой и подписью",
    cssVar: "--app-row-gap",
    uses: ".app-row — все пункты меню и строки списков",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "stackGap",
    group: "row",
    label: "Зазор между секциями",
    hint: "Вертикальный промежуток блоков на экране",
    cssVar: "--app-stack-gap",
    uses: ".app-stack — секции профиля и главной",
    unit: "rem",
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    key: "sectionRadius",
    group: "radius",
    label: "Скругление крупных блоков",
    hint: "Радиус карточек и секций",
    cssVar: "--app-section-radius",
    uses: "Карточки профиля, секции, верхние углы drawer/sheet на карте",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "sectionRadiusSm",
    group: "radius",
    label: "Скругление мелких блоков",
    hint: "Радиус компактных элементов",
    cssVar: "--app-section-radius-sm",
    uses: "Малые карточки, внутренние панели, .app-section--sm",
    unit: "rem",
    min: 0,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "buttonRadius",
    group: "button",
    label: "Скругление кнопок",
    hint: "Радиус основных и вторичных кнопок",
    cssVar: "--app-button-radius",
    uses: ".theme-button, .theme-button-secondary — везде в приложении",
    unit: "rem",
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    key: "buttonPadX",
    group: "button",
    label: "Кнопка: отступ слева/справа",
    hint: "Горизонтальный padding кнопки",
    cssVar: "--app-button-pad-x",
    uses: "Все .theme-button / .theme-button-secondary",
    unit: "rem",
    min: 0.25,
    max: 2,
    step: 0.05,
  },
  {
    key: "buttonPadY",
    group: "button",
    label: "Кнопка: отступ сверху/снизу",
    hint: "Вертикальный padding кнопки",
    cssVar: "--app-button-pad-y",
    uses: "Все .theme-button / .theme-button-secondary",
    unit: "rem",
    min: 0.25,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "borderWidth",
    group: "border",
    label: "Толщина рамок",
    hint: "Линии границ блоков",
    cssVar: "--app-border-width",
    uses: "Карточки, секции, вторичные кнопки, разделители строк",
    unit: "px",
    min: 0,
    max: 4,
    step: 0.5,
  },
  {
    key: "fontSize",
    group: "text",
    label: "Базовый размер текста",
    hint: "Главный rem. От него считаются мелкий / обычный / крупный текст по всему приложению",
    cssVar: "--app-font-size",
    uses: "Весь текст UI: профиль, история, чат, кнопки, подписи, заголовки, sheet/drawer, главная. Не маркеры на карте (у них свой размер)",
    unit: "rem",
    min: 0.8,
    max: 1.35,
    step: 0.025,
  },
  {
    key: "lineHeight",
    group: "text",
    label: "Межстрочный интервал",
    hint: "Высота строки относительно размера шрифта",
    cssVar: "--app-line-height",
    uses: "body и весь наследуемый текст (абзацы, описания, списки)",
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
  // Старый fontSize в px → rem (не ниже 0.8rem)
  if (unit === "rem" && /^(\d*\.?\d+)\s*px$/i.test(trimmed)) {
    return formatLayoutValue(
      Math.max(0.8, parseLayoutNumber(trimmed) / 16),
      "rem",
    );
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
