/** День недели: 0 = вс … 6 = сб (как в Date.getDay()). */
const DAY_KEYS: Record<number, string[]> = {
  0: ["sunday", "sun", "вс", "воскресенье", "0", "7"],
  1: ["monday", "mon", "пн", "понедельник", "1"],
  2: ["tuesday", "tue", "вт", "вторник", "2"],
  3: ["wednesday", "wed", "ср", "среда", "3"],
  4: ["thursday", "thu", "чт", "четверг", "4"],
  5: ["friday", "fri", "пт", "пятница", "5"],
  6: ["saturday", "sat", "сб", "суббота", "6"],
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\./g, "");
}

function findTodayRawHours(
  openHours: Record<string, string>,
  now = new Date(),
): string | null {
  const aliases = DAY_KEYS[now.getDay()] ?? [];
  const entries = Object.entries(openHours);

  for (const alias of aliases) {
    for (const [key, value] of entries) {
      if (normalizeKey(key) === alias && value?.trim()) {
        return value.trim();
      }
    }
  }

  // иногда ключи вида "mon-fri" / "пн-пт"
  for (const [key, value] of entries) {
    const nk = normalizeKey(key);
    if (!value?.trim()) continue;
    if (
      (nk.includes("mon") && nk.includes("fri") && now.getDay() >= 1 && now.getDay() <= 5) ||
      (nk.includes("пн") && nk.includes("пт") && now.getDay() >= 1 && now.getDay() <= 5) ||
      (nk.includes("weekday") && now.getDay() >= 1 && now.getDay() <= 5) ||
      (nk.includes("weekend") && (now.getDay() === 0 || now.getDay() === 6))
    ) {
      return value.trim();
    }
  }

  return null;
}

function formatRangeLabel(raw: string): string {
  const value = raw.trim();
  if (!value) return "Часы уточняйте";

  if (/24\s*\/\s*7|круглосуточ/i.test(value) || value === "00:00-24:00") {
    return "Круглосуточно";
  }

  // "09:00-22:00" → "с 09:00 до 22:00"
  const range = value.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (range) {
    return `с ${range[1]} до ${range[2]}`;
  }

  const until = value.match(/(?:до|until)\s*(\d{1,2}:\d{2})/i);
  if (until) {
    return `до ${until[1]}`;
  }

  return value;
}

/**
 * Метка режима работы на сегодня.
 * Пример: «сегодня с 09:00 до 22:00», «сегодня круглосуточно».
 */
export function formatOpenHoursLabel(
  openHours: Record<string, string> | null | undefined,
  now = new Date(),
): string {
  if (!openHours || Object.keys(openHours).length === 0) {
    return "Часы уточняйте";
  }

  const todayRaw = findTodayRawHours(openHours, now);
  const sample =
    todayRaw ??
    Object.values(openHours)
      .map((v) => v.trim())
      .find(Boolean);

  if (!sample) return "Часы уточняйте";

  const range = formatRangeLabel(sample);
  if (range === "Часы уточняйте") return range;
  if (range === "Круглосуточно") {
    return todayRaw ? "сегодня круглосуточно" : "Круглосуточно";
  }

  // если взяли именно сегодняшний день — префикс «сегодня»
  if (todayRaw) {
    return `сегодня ${range}`;
  }

  return range;
}

export function formatHoursUntilClose(
  openHours: Record<string, string> | null | undefined,
): string {
  const label = formatOpenHoursLabel(openHours);
  if (label.startsWith("сегодня ")) {
    return `Сегодня работает ${label.replace(/^сегодня\s+/i, "")}`;
  }
  if (label === "Круглосуточно" || label === "сегодня круглосуточно") {
    return "Работает круглосуточно";
  }
  if (label === "Часы уточняйте") return "Время работы уточняйте на месте";
  return `Работает ${label}`;
}

/** Компактный график: «09:00 – 22:00», «Круглосуточно» */
export function compactHoursLabel(hoursLabel: string | null | undefined): string {
  const raw = (hoursLabel ?? "").trim();
  if (!raw) return "Часы уточняйте";
  if (/круглосут|24\s*\/\s*7/i.test(raw)) return "Круглосуточно";
  const range = raw.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
  if (range) return `${range[1]} – ${range[2]}`;
  return raw.replace(/^сегодня\s+/i, "").trim() || "Часы уточняйте";
}

export type WeekHoursRow = {
  /** 0 = вс … 6 = сб */
  dayIndex: number;
  shortLabel: string;
  hours: string;
  isToday: boolean;
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_SHORT: Record<number, string> = {
  0: "Вс",
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
};

function findDayRawHours(
  openHours: Record<string, string>,
  dayIndex: number,
): string | null {
  const aliases = DAY_KEYS[dayIndex] ?? [];
  const entries = Object.entries(openHours);

  for (const alias of aliases) {
    for (const [key, value] of entries) {
      if (normalizeKey(key) === alias && value?.trim()) {
        return value.trim();
      }
    }
  }

  for (const [key, value] of entries) {
    const nk = normalizeKey(key);
    if (!value?.trim()) continue;
    const isWeekday = dayIndex >= 1 && dayIndex <= 5;
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    if (
      (nk.includes("mon") && nk.includes("fri") && isWeekday) ||
      (nk.includes("пн") && nk.includes("пт") && isWeekday) ||
      (nk.includes("weekday") && isWeekday) ||
      (nk.includes("weekend") && isWeekend)
    ) {
      return value.trim();
    }
  }

  return null;
}

function formatDayHoursDisplay(raw: string | null): string {
  if (!raw?.trim()) return "—";
  const value = raw.trim();
  if (
    /закрыт|closed|day\s*off|выходн/i.test(value) ||
    value === "-" ||
    value === "—"
  ) {
    return "Выходной";
  }
  return compactHoursLabel(formatRangeLabel(value));
}

/** График Пн–Вс для карточки на карте */
export function buildWeeklyHoursSchedule(
  openHours: Record<string, string> | null | undefined,
  now = new Date(),
): WeekHoursRow[] {
  if (!openHours || Object.keys(openHours).length === 0) {
    return [];
  }

  const today = now.getDay();
  return WEEK_ORDER.map((dayIndex) => ({
    dayIndex,
    shortLabel: DAY_SHORT[dayIndex] ?? "—",
    hours: formatDayHoursDisplay(findDayRawHours(openHours, dayIndex)),
    isToday: dayIndex === today,
  }));
}
