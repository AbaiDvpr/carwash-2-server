export const THEME_PALETTE_STORAGE_KEY = "theme_palette";
export const THEME_PALETTE_CHANGE_EVENT = "carwash-theme-palette-change";

/** @deprecated старый ключ — читаем для миграции */
const LEGACY_ACCENTS_KEY = "theme_accents";

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  /** Фон страницы / приложения */
  background: string;
  /** Фон карточек и секций */
  block: string;
  /** Hover по строкам / кнопкам-secondary */
  hover: string;
  /** Основные кнопки (CTA) */
  button: string;
  /** Кнопка при active / pressed */
  buttonHover: string;
  /** Текст на кнопке */
  buttonText: string;
  /** Основной текст */
  text: string;
  /** Подписи / description / hint */
  description: string;
  /** Рамки секций, строк, drawers */
  border: string;
  /** Ошибка / destructive */
  danger: string;
  /** Успех */
  success: string;
  /** Предупреждение */
  warning: string;
  /** Акцент мойки на карте */
  mapWash: string;
  /** Акцент ЭЗС на карте */
  mapCharging: string;
};

export type ThemePalettes = {
  light: ThemePalette;
  dark: ThemePalette;
};

export const DEFAULT_PALETTES: ThemePalettes = {
  light: {
    background: "#f4f4f5",
    block: "#ffffff",
    hover: "#ececef",
    button: "#2563eb",
    buttonHover: "#1d4ed8",
    buttonText: "#ffffff",
    text: "#18181b",
    description: "#a1a1aa",
    border: "#e4e4e7",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
    mapWash: "#38bdf8",
    mapCharging: "#facc15",
  },
  dark: {
    background: "#09090b",
    block: "#18181b",
    hover: "#27272a",
    button: "#3b82f6",
    buttonHover: "#2563eb",
    buttonText: "#ffffff",
    text: "#f4f4f5",
    description: "#a1a1aa",
    border: "#3f3f46",
    danger: "#f87171",
    success: "#4ade80",
    warning: "#fbbf24",
    mapWash: "#38bdf8",
    mapCharging: "#facc15",
  },
};

export const PALETTE_FIELD_META: {
  key: keyof ThemePalette;
  label: string;
  hint: string;
  /** CSS-переменные, которые пишутся из этого цвета */
  cssVars: string[];
  /** Где используется в UI */
  uses: string;
}[] = [
  {
    key: "background",
    label: "Background",
    hint: "Фон страницы / приложения",
    cssVars: ["--background"],
    uses: "body, .app-layout, .app-shell",
  },
  {
    key: "block",
    label: "Block",
    hint: "Фон карточек и секций",
    cssVars: ["--app-block", "--color-white"],
    uses: ".theme-block, .app-section, drawers",
  },
  {
    key: "border",
    label: "Border",
    hint: "Рамки секций и разделители",
    cssVars: ["--app-border"],
    uses: ".app-section, .app-row+, sheets, карточки",
  },
  {
    key: "hover",
    label: "Hover",
    hint: "Подсветка строк и secondary",
    cssVars: ["--app-hover"],
    uses: "строки, закрытие drawer, :active",
  },
  {
    key: "button",
    label: "Button",
    hint: "Основные кнопки CTA",
    cssVars: ["--app-button", "--color-blue-500/600"],
    uses: ".theme-button, акценты, чипы",
  },
  {
    key: "buttonHover",
    label: "Button hover",
    hint: "Кнопка при нажатии",
    cssVars: ["--app-button-hover", "--color-blue-700"],
    uses: ".theme-button:active, pressed CTA",
  },
  {
    key: "buttonText",
    label: "Button text",
    hint: "Текст на кнопке",
    cssVars: ["--app-button-text"],
    uses: ".theme-button",
  },
  {
    key: "text",
    label: "Text",
    hint: "Основной текст",
    cssVars: ["--app-text", "--foreground"],
    uses: "заголовки, строки, drawer title",
  },
  {
    key: "description",
    label: "Description",
    hint: "Подписи и вторичный текст",
    cssVars: ["--app-description"],
    uses: ".theme-description, hints",
  },
  {
    key: "danger",
    label: "Danger",
    hint: "Ошибка / destructive",
    cssVars: ["--app-danger"],
    uses: "выход, удаление, ошибки",
  },
  {
    key: "success",
    label: "Success",
    hint: "Успех",
    cssVars: ["--app-success"],
    uses: "статус ok, подтверждения",
  },
  {
    key: "warning",
    label: "Warning",
    hint: "Предупреждение",
    cssVars: ["--app-warning"],
    uses: "статус pending / attention",
  },
  {
    key: "mapWash",
    label: "Map wash",
    hint: "Цвет мойки на карте",
    cssVars: ["--map-wash"],
    uses: "маркеры, кластеры, таб Мойка",
  },
  {
    key: "mapCharging",
    label: "Map charging",
    hint: "Цвет ЭЗС на карте",
    cssVars: ["--map-charging"],
    uses: "маркеры, кластеры, таб ЭЗС",
  },
];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

/** Простая коррекция яркости hex для hover / lighter. */
export function adjustHex(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;

  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const to = (channel: string) =>
    clamp(parseInt(channel, 16) + amount)
      .toString(16)
      .padStart(2, "0");

  return `#${to(raw.slice(0, 2))}${to(raw.slice(2, 4))}${to(raw.slice(4, 6))}`;
}

function normalizePalette(raw: unknown, fallback: ThemePalette): ThemePalette {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const obj = raw as Partial<ThemePalette>;

  const background = normalizeHex(obj.background, fallback.background);
  const text = normalizeHex(obj.text, fallback.text);
  const button = normalizeHex(obj.button, fallback.button);
  const description = normalizeHex(obj.description, fallback.description);

  return {
    background,
    // старые сохранения без block → как background
    block: normalizeHex(obj.block, background),
    hover: normalizeHex(obj.hover, fallback.hover),
    button,
    buttonHover: normalizeHex(
      obj.buttonHover,
      obj.button ? adjustHex(button, -20) : fallback.buttonHover,
    ),
    buttonText: normalizeHex(obj.buttonText, fallback.buttonText),
    text,
    description,
    border: normalizeHex(obj.border, fallback.border),
    danger: normalizeHex(obj.danger, fallback.danger),
    success: normalizeHex(obj.success, fallback.success),
    warning: normalizeHex(obj.warning, fallback.warning),
    mapWash: normalizeHex(obj.mapWash, fallback.mapWash),
    mapCharging: normalizeHex(obj.mapCharging, fallback.mapCharging),
  };
}

function normalizePalettes(raw: unknown): ThemePalettes {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PALETTES);
  const obj = raw as Partial<ThemePalettes>;
  return {
    light: normalizePalette(obj.light, DEFAULT_PALETTES.light),
    dark: normalizePalette(obj.dark, DEFAULT_PALETTES.dark),
  };
}

function migrateFromLegacyAccents(): ThemePalettes | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_ACCENTS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { light?: string; dark?: string };
    const map: Record<string, string> = {
      blue: "#2563eb",
      emerald: "#059669",
      violet: "#7c3aed",
      rose: "#e11d48",
      orange: "#ea580c",
      cyan: "#0891b2",
    };

    const next = structuredClone(DEFAULT_PALETTES);
    if (parsed.light && map[parsed.light]) {
      next.light.button = map[parsed.light]!;
    }
    if (parsed.dark && map[parsed.dark]) {
      next.dark.button = map[parsed.dark]!;
      if (parsed.dark === "blue") next.dark.button = "#3b82f6";
    }
    return next;
  } catch {
    return null;
  }
}

export function readThemePalettes(): ThemePalettes {
  if (typeof window === "undefined") return structuredClone(DEFAULT_PALETTES);

  try {
    const raw = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
    if (raw) return normalizePalettes(JSON.parse(raw) as unknown);

    const migrated = migrateFromLegacyAccents();
    if (migrated) {
      writeThemePalettes(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }

  return structuredClone(DEFAULT_PALETTES);
}

export function writeThemePalettes(palettes: ThemePalettes): ThemePalettes {
  const next = normalizePalettes(palettes);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(THEME_PALETTE_CHANGE_EVENT, { detail: next }),
    );
  }

  return next;
}

export function setThemePaletteField(
  mode: ThemeMode,
  field: keyof ThemePalette,
  value: string,
): ThemePalettes {
  const current = readThemePalettes();
  const next: ThemePalettes = {
    ...current,
    [mode]: {
      ...current[mode],
      [field]: normalizeHex(value, current[mode][field]),
    },
  };
  return writeThemePalettes(next);
}

export function resetThemePalette(mode?: ThemeMode): ThemePalettes {
  if (!mode) return writeThemePalettes(structuredClone(DEFAULT_PALETTES));

  const current = readThemePalettes();
  return writeThemePalettes({
    ...current,
    [mode]: { ...DEFAULT_PALETTES[mode] },
  });
}

/**
 * Вешает полную палитру на CSS-переменные приложения + Tailwind zinc/blue/white.
 */
export function applyThemePalette(
  mode: ThemeMode,
  palettes: ThemePalettes = readThemePalettes(),
): void {
  if (typeof document === "undefined") return;

  const palette = palettes[mode];
  const root = document.documentElement;
  const buttonHover = palette.buttonHover || adjustHex(palette.button, -20);
  const buttonSoft = adjustHex(palette.button, 25);

  root.style.setProperty("--background", palette.background);
  root.style.setProperty("--foreground", palette.text);
  root.style.setProperty("--app-block", palette.block);
  root.style.setProperty("--app-hover", palette.hover);
  root.style.setProperty("--app-button", palette.button);
  root.style.setProperty("--app-button-hover", buttonHover);
  root.style.setProperty("--app-button-text", palette.buttonText);
  root.style.setProperty("--app-text", palette.text);
  root.style.setProperty("--app-description", palette.description);
  root.style.setProperty("--app-border", palette.border);
  root.style.setProperty("--app-danger", palette.danger);
  root.style.setProperty("--app-success", palette.success);
  root.style.setProperty("--app-warning", palette.warning);
  root.style.setProperty("--map-wash", palette.mapWash);
  root.style.setProperty("--map-charging", palette.mapCharging);

  root.style.setProperty("--color-blue-500", buttonSoft);
  root.style.setProperty("--color-blue-600", palette.button);
  root.style.setProperty("--color-blue-700", buttonHover);
  root.style.setProperty("--color-red-500", palette.danger);
  root.style.setProperty("--color-red-600", palette.danger);
  root.style.setProperty("--color-emerald-500", palette.success);
  root.style.setProperty("--color-emerald-600", palette.success);
  root.style.setProperty("--color-amber-500", palette.warning);
  root.style.setProperty("--color-amber-600", palette.warning);

  // Карточки часто bg-white / dark:bg-zinc-950
  root.style.setProperty("--color-white", palette.block);

  if (mode === "light") {
    root.style.setProperty("--color-zinc-50", palette.hover);
    root.style.setProperty("--color-zinc-100", adjustHex(palette.hover, -8));
    root.style.setProperty("--color-zinc-200", adjustHex(palette.hover, -20));
    root.style.setProperty("--color-zinc-300", adjustHex(palette.description, 40));
    root.style.setProperty("--color-zinc-400", palette.description);
    root.style.setProperty("--color-zinc-500", adjustHex(palette.description, -20));
    root.style.setProperty("--color-zinc-800", adjustHex(palette.text, 28));
    root.style.setProperty("--color-zinc-900", palette.text);
    root.style.setProperty("--color-zinc-950", adjustHex(palette.block, -10));
  } else {
    root.style.setProperty("--color-zinc-50", palette.text);
    root.style.setProperty("--color-zinc-100", adjustHex(palette.text, -10));
    root.style.setProperty("--color-zinc-200", adjustHex(palette.text, -28));
    root.style.setProperty("--color-zinc-300", adjustHex(palette.description, 30));
    root.style.setProperty("--color-zinc-400", palette.description);
    root.style.setProperty("--color-zinc-500", adjustHex(palette.description, -15));
    root.style.setProperty("--color-zinc-800", adjustHex(palette.hover, 12));
    root.style.setProperty("--color-zinc-900", palette.hover);
    root.style.setProperty("--color-zinc-950", palette.block);
  }
}
