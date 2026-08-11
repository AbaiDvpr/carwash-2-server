/** Стили маркеров карты: фигура + цвета + конструктор содержимого, localStorage */

export const MAP_MARKER_STYLES_KEY = "map_marker_styles";

export const MARKER_SHAPE_COUNT = 30;

export type MarkerKind = "wash" | "charging";

/** Части внутри маркера (конструктор) */
export type MarkerFacePart = "icon" | "free" | "divider" | "total";

export type MarkerFaceLayout = {
  /** Порядок блоков слева направо */
  parts: MarkerFacePart[];
  /** Расстояние между блоками, rem */
  gap: number;
  /** Толщина дивайдера, px */
  dividerWidth: number;
  /** Высота дивайдера, em (относительно цифр) */
  dividerHeight: number;
  /** Прозрачность дивайдера 0…1 */
  dividerOpacity: number;
};

export type KindMarkerPrefs = {
  /** ID фигуры: 1…30 */
  shapeId: number;
  /** Основной цвет маркера */
  accent: string;
  /** Цвет текста / иконки на маркере */
  ink: string;
  /** Progress: свободно */
  progressFree: string;
  /** Progress: занято */
  progressBusy: string;
  /**
   * Показывать всего (2/4 с дивайдером).
   * false — только свободные, без «/» и без total.
   */
  showTotal: boolean;
  /** Внутренняя раскладка: иконка / свободно / дивайдер / всего */
  layout: MarkerFaceLayout;
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
  "#ffffff",
  "#f8fafc",
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
  "#1c1917",
  "#64748b",
] as const;

export const DEFAULT_MARKER_FACE_LAYOUT: MarkerFaceLayout = {
  parts: ["icon", "free"],
  gap: 0.14,
  dividerWidth: 2.5,
  dividerHeight: 0.95,
  dividerOpacity: 0.9,
};

export const MARKER_FACE_PART_META: {
  id: MarkerFacePart;
  label: string;
  once: boolean;
}[] = [
  { id: "icon", label: "Иконка", once: true },
  { id: "free", label: "Свободно", once: true },
];

export const DEFAULT_MARKER_STYLE_PREFS: MapMarkerStylePrefs = {
  wash: {
    shapeId: 4,
    accent: "#38bdf8",
    ink: "#ffffff",
    progressFree: "#ffffff",
    progressBusy: "#ffffff",
    /** На точке только свободные, без «/» и «всего» */
    showTotal: false,
    layout: structuredClone(DEFAULT_MARKER_FACE_LAYOUT),
  },
  charging: {
    shapeId: 4,
    accent: "#facc15",
    ink: "#ffffff",
    progressFree: "#ffffff",
    progressBusy: "#ffffff",
    showTotal: false,
    layout: structuredClone(DEFAULT_MARKER_FACE_LAYOUT),
  },
};

/** Пока UI смены стиля скрыт: у мойки и ЭЗС только пилюля + белый текст. */
const FORCE_MARKER_PILL = true;
const FORCE_MARKER_INK = "#ffffff";
const FORCE_MARKER_SHAPE_ID = 4;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const PART_SET = new Set<MarkerFacePart>(["icon", "free"]);

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

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeMarkerFaceLayout(
  raw: Partial<MarkerFaceLayout> | undefined,
  fallback: MarkerFaceLayout = DEFAULT_MARKER_FACE_LAYOUT,
): MarkerFaceLayout {
  const partsRaw = Array.isArray(raw?.parts) ? raw.parts : fallback.parts;
  const parts: MarkerFacePart[] = [];
  const seenOnce = new Set<MarkerFacePart>();

  for (const item of partsRaw) {
    if (!PART_SET.has(item as MarkerFacePart)) continue;
    const part = item as MarkerFacePart;
    const meta = MARKER_FACE_PART_META.find((m) => m.id === part);
    if (meta?.once) {
      if (seenOnce.has(part)) continue;
      seenOnce.add(part);
    }
    parts.push(part);
  }

  if (parts.length === 0) {
    parts.push(...fallback.parts);
  }

  // На точке только свободные — без «/» и «всего»
  const cleaned = parts.filter((part) => part !== "divider" && part !== "total");
  if (!cleaned.includes("free")) {
    cleaned.push("free");
  }

  return {
    parts: cleaned,
    gap: clampNum(raw?.gap, 0, 0.6, fallback.gap),
    dividerWidth: clampNum(raw?.dividerWidth, 1, 8, fallback.dividerWidth),
    dividerHeight: clampNum(raw?.dividerHeight, 0.5, 1.8, fallback.dividerHeight),
    dividerOpacity: clampNum(raw?.dividerOpacity, 0.15, 1, fallback.dividerOpacity),
  };
}

function normalizeKindPrefs(
  raw: Partial<KindMarkerPrefs> | undefined,
  fallback: KindMarkerPrefs,
): KindMarkerPrefs {
  return {
    shapeId: FORCE_MARKER_PILL
      ? FORCE_MARKER_SHAPE_ID
      : clampMarkerShapeId(raw?.shapeId ?? fallback.shapeId),
    accent: normalizeHexColor(raw?.accent, fallback.accent),
    ink: FORCE_MARKER_PILL
      ? FORCE_MARKER_INK
      : normalizeHexColor(raw?.ink, fallback.ink),
    progressFree: "#ffffff",
    progressBusy: "#ffffff",
    showTotal: false,
    layout: normalizeMarkerFaceLayout(raw?.layout, fallback.layout),
  };
}

/** Части лица маркера: только иконка + свободные (без дивайдера и «всего»). */
export function resolveMarkerFaceParts(
  prefs: Pick<KindMarkerPrefs, "layout" | "showTotal">,
): MarkerFacePart[] {
  const layout = normalizeMarkerFaceLayout(prefs.layout);
  const parts = layout.parts.filter(
    (part) => part !== "divider" && part !== "total",
  );
  if (!parts.includes("free")) {
    parts.push("free");
  }
  return parts;
}

/** Белая обводка маркера (без цветного progress). */
export function buildMarkerSlotGradient(_free?: number, _total?: number): string {
  return "#ffffff";
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
  const layout = normalizeMarkerFaceLayout(prefs.layout);
  return {
    "--marker-accent": prefs.accent,
    "--marker-ink": prefs.ink,
    "--map-marker-free-color": prefs.progressFree,
    "--map-marker-busy-color": prefs.progressBusy,
    "--map-marker-gap": `${layout.gap}rem`,
    "--map-marker-sep-w": `${layout.dividerWidth}px`,
    "--map-marker-sep-h": `${layout.dividerHeight}em`,
    "--map-marker-sep-opacity": String(layout.dividerOpacity),
  };
}

export function stylesForKind(_kind: MarkerKind): MarkerShapeMeta[] {
  return MARKER_SHAPES;
}

/** Добавить часть в раскладку (icon/free — по одному разу). */
export function addMarkerFacePart(
  layout: MarkerFaceLayout,
  part: MarkerFacePart,
): MarkerFaceLayout {
  const next = normalizeMarkerFaceLayout(layout);
  const meta = MARKER_FACE_PART_META.find((m) => m.id === part);
  if (meta?.once && next.parts.includes(part)) return next;
  return normalizeMarkerFaceLayout({
    ...next,
    parts: [...next.parts, part],
  });
}

export function removeMarkerFacePartAt(
  layout: MarkerFaceLayout,
  index: number,
): MarkerFaceLayout {
  const next = normalizeMarkerFaceLayout(layout);
  if (index < 0 || index >= next.parts.length) return next;
  const parts = next.parts.filter((_, i) => i !== index);
  return normalizeMarkerFaceLayout({ ...next, parts });
}

export function moveMarkerFacePart(
  layout: MarkerFaceLayout,
  index: number,
  dir: -1 | 1,
): MarkerFaceLayout {
  const next = normalizeMarkerFaceLayout(layout);
  const to = index + dir;
  if (index < 0 || to < 0 || index >= next.parts.length || to >= next.parts.length) {
    return next;
  }
  const parts = [...next.parts];
  const [item] = parts.splice(index, 1);
  parts.splice(to, 0, item);
  return normalizeMarkerFaceLayout({ ...next, parts });
}
