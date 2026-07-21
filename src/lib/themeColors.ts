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
  /** Основной текст */
  text: string;
  /** Подписи / description / hint */
  description: string;
};

export type ThemePalettes = {
  light: ThemePalette;
  dark: ThemePalette;
};

export const DEFAULT_PALETTES: ThemePalettes = {
  light: {
    background: "#ffffff",
    block: "#ffffff",
    hover: "#f4f4f5",
    button: "#2563eb",
    text: "#18181b",
    description: "#a1a1aa",
  },
  dark: {
    background: "#09090b",
    block: "#09090b",
    hover: "#18181b",
    button: "#3b82f6",
    text: "#f4f4f5",
    description: "#a1a1aa",
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
    hint: "Фон карточек, секций, drawer",
    cssVars: ["--app-block", "--color-white"],
    uses: ".theme-block, .map-drawer, .map-list-sheet, карточки",
  },
  {
    key: "hover",
    label: "Hover",
    hint: "Подсветка строк и кнопок",
    cssVars: ["--app-hover"],
    uses: ".theme-hover, закрытие drawer, zoom :active",
  },
  {
    key: "button",
    label: "Button",
    hint: "Кнопки, акценты, ссылки CTA",
    cssVars: ["--app-button", "--app-button-hover", "--color-blue-500/600/700"],
    uses: ".theme-button, drawer label/2ГИС, иконки категорий",
  },
  {
    key: "text",
    label: "Text",
    hint: "Основной текст",
    cssVars: ["--app-text", "--foreground"],
    uses: "заголовки, телефон, баланс, drawer title",
  },
  {
    key: "description",
    label: "Description",
    hint: "Подписи и вторичный текст",
    cssVars: ["--app-description"],
    uses: ".theme-description, drawer coords / route-label",
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

function normalizePalette(raw: unknown, fallback: ThemePalette): ThemePalette {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const obj = raw as Partial<ThemePalette> & { buttonHover?: string };

  const background = normalizeHex(obj.background, fallback.background);
  const text = normalizeHex(obj.text, fallback.text);
  const button = normalizeHex(obj.button, fallback.button);

  return {
    background,
    // старые сохранения без block → как background
    block: normalizeHex(obj.block, background),
    hover: normalizeHex(obj.hover ?? obj.buttonHover, fallback.hover),
    button,
    text,
    description: normalizeHex(obj.description, fallback.description),
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
  const buttonHover = adjustHex(palette.button, -20);
  const buttonSoft = adjustHex(palette.button, 25);

  root.style.setProperty("--background", palette.background);
  root.style.setProperty("--foreground", palette.text);
  root.style.setProperty("--app-block", palette.block);
  root.style.setProperty("--app-hover", palette.hover);
  root.style.setProperty("--app-button", palette.button);
  root.style.setProperty("--app-button-hover", buttonHover);
  root.style.setProperty("--app-text", palette.text);
  root.style.setProperty("--app-description", palette.description);

  root.style.setProperty("--color-blue-500", buttonSoft);
  root.style.setProperty("--color-blue-600", palette.button);
  root.style.setProperty("--color-blue-700", buttonHover);

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
