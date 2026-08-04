/** Стили маркеров карты: фигура + цвета для мойки / ЭЗС, localStorage */

export const MAP_MARKER_STYLES_KEY = "map_marker_styles";

export const MARKER_SHAPE_COUNT = 30;

export type MarkerKind = "wash" | "charging";

export type KindMarkerPrefs = {
  /** ID фигуры: 1…30 */
  shapeId: number;
  /** Основной цвет маркера */
  accent: string;
  /** Progress: свободно */
  progressFree: string;
  /** Progress: занято */
  progressBusy: string;
};

export type MapMarkerStylePrefs = {
  wash: KindMarkerPrefs;
  charging: KindMarkerPrefs;
};

export type MarkerShapeMeta = {
  id: number;
  name: string;
  hint: string;
};

export const MARKER_SHAPES: MarkerShapeMeta[] = [
  { id: 1, name: "Круг", hint: "Кольцо + progress" },
  { id: 2, name: "Пин", hint: "Капля + progress" },
  { id: 3, name: "Квадрат", hint: "Скруглённый + progress" },
  { id: 4, name: "Пилюля", hint: "Горизонтальный + progress" },
  { id: 5, name: "Иконка", hint: "Крупная иконка + дуга" },
  { id: 6, name: "Мягкий", hint: "Светлый центр" },
  { id: 7, name: "Контур", hint: "Белый фон" },
  { id: 8, name: "Компакт", hint: "Маленький значок" },
  { id: 9, name: "Жирный", hint: "Толстое кольцо" },
  { id: 10, name: "Бейдж", hint: "Счётчик сверху" },
  { id: 11, name: "Ромб", hint: "Повёрнутый квадрат" },
  { id: 12, name: "Щит", hint: "Форма щита" },
  { id: 13, name: "Октагон", hint: "8 углов" },
  { id: 14, name: "Трек", hint: "Толстая дуга progress" },
  { id: 15, name: "Точка", hint: "Мини-круг" },
  { id: 16, name: "Капсула V", hint: "Вертикальная пилюля" },
  { id: 17, name: "Рамка", hint: "Двойная обводка" },
  { id: 18, name: "Неон", hint: "Свечение accent" },
  { id: 19, name: "Инсет", hint: "Progress внутри" },
  { id: 20, name: "Чип", hint: "Плоский чип" },
  { id: 21, name: "Пузырь", hint: "Круглый баббл" },
  { id: 22, name: "Столбик", hint: "Узкий вертикальный" },
  { id: 23, name: "Флаг", hint: "Пин с широким лицом" },
  { id: 24, name: "Кольцо+", hint: "Тонкий progress" },
  { id: 25, name: "Медаль", hint: "Круг + лента" },
  { id: 26, name: "Тикет", hint: "Срезанные углы" },
  { id: 27, name: "Гекс", hint: "Шестиугольник" },
  { id: 28, name: "Слэб", hint: "Широкая плита" },
  { id: 29, name: "Орбита", hint: "Двойное кольцо" },
  { id: 30, name: "Стек", hint: "Слой + бейдж" },
];

/** Палитра быстрого выбора */
export const MARKER_COLOR_PRESETS = [
  "#38bdf8",
  "#0ea5e9",
  "#22c55e",
  "#14b8a6",
  "#facc15",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#6366f1",
  "#0f172a",
  "#64748b",
] as const;

export const DEFAULT_MARKER_STYLE_PREFS: MapMarkerStylePrefs = {
  wash: {
    shapeId: 1,
    accent: "#38bdf8",
    progressFree: "#22c55e",
    progressBusy: "#f59e0b",
  },
  charging: {
    shapeId: 1,
    accent: "#facc15",
    progressFree: "#22c55e",
    progressBusy: "#f59e0b",
  },
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function clampMarkerShapeId(id: unknown): number {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MARKER_SHAPE_COUNT, Math.max(1, Math.round(n)));
}

/** Совместимость со старым именем */
export const clampMarkerStyleId = clampMarkerShapeId;
export const MARKER_STYLE_COUNT = MARKER_SHAPE_COUNT;
export const WASH_MARKER_STYLES = MARKER_SHAPES;
export const CHARGING_MARKER_STYLES = MARKER_SHAPES;

export function normalizeHexColor(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!HEX_RE.test(raw)) return fallback;
  if (raw.length === 4) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return raw.toLowerCase();
}

function normalizeKindPrefs(
  raw: Partial<KindMarkerPrefs> | undefined,
  fallback: KindMarkerPrefs,
): KindMarkerPrefs {
  return {
    shapeId: clampMarkerShapeId(raw?.shapeId ?? fallback.shapeId),
    accent: normalizeHexColor(raw?.accent, fallback.accent),
    progressFree: normalizeHexColor(raw?.progressFree, fallback.progressFree),
    progressBusy: normalizeHexColor(raw?.progressBusy, fallback.progressBusy),
  };
}

export function parseMapMarkerStylePrefs(
  raw: string | null,
): MapMarkerStylePrefs {
  if (!raw) return structuredClone(DEFAULT_MARKER_STYLE_PREFS);
  try {
    const data = JSON.parse(raw) as Partial<MapMarkerStylePrefs> & {
      /** legacy */
      washId?: number;
      chargingId?: number;
    };

    const washFallback: KindMarkerPrefs = {
      ...DEFAULT_MARKER_STYLE_PREFS.wash,
      shapeId: clampMarkerShapeId(
        data.wash?.shapeId ?? data.washId ?? DEFAULT_MARKER_STYLE_PREFS.wash.shapeId,
      ),
    };
    const chargingFallback: KindMarkerPrefs = {
      ...DEFAULT_MARKER_STYLE_PREFS.charging,
      shapeId: clampMarkerShapeId(
        data.charging?.shapeId ??
          data.chargingId ??
          DEFAULT_MARKER_STYLE_PREFS.charging.shapeId,
      ),
    };

    return {
      wash: normalizeKindPrefs(data.wash, washFallback),
      charging: normalizeKindPrefs(data.charging, chargingFallback),
    };
  } catch {
    return structuredClone(DEFAULT_MARKER_STYLE_PREFS);
  }
}

export function readMapMarkerStylePrefs(): MapMarkerStylePrefs {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_MARKER_STYLE_PREFS);
  }
  return parseMapMarkerStylePrefs(
    window.localStorage.getItem(MAP_MARKER_STYLES_KEY),
  );
}

export function writeMapMarkerStylePrefs(prefs: MapMarkerStylePrefs): void {
  if (typeof window === "undefined") return;
  const next: MapMarkerStylePrefs = {
    wash: normalizeKindPrefs(prefs.wash, DEFAULT_MARKER_STYLE_PREFS.wash),
    charging: normalizeKindPrefs(
      prefs.charging,
      DEFAULT_MARKER_STYLE_PREFS.charging,
    ),
  };
  window.localStorage.setItem(MAP_MARKER_STYLES_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("map-marker-styles-changed", { detail: next }),
  );
}

export function markerStyleClass(kind: MarkerKind, shapeId: number): string {
  const id = clampMarkerShapeId(shapeId);
  return `map-marker map-marker--${kind} map-marker--s${id}`;
}

export function markerColorStyle(
  prefs: KindMarkerPrefs,
): Record<string, string> {
  return {
    "--marker-accent": prefs.accent,
    "--map-marker-free-color": prefs.progressFree,
    "--map-marker-busy-color": prefs.progressBusy,
  };
}

export function stylesForKind(_kind: MarkerKind): MarkerShapeMeta[] {
  return MARKER_SHAPES;
}
