/** Метка режима работы для карточки (напр. «до 22:00»). */
export function formatOpenHoursLabel(
  openHours: Record<string, string> | null | undefined,
): string {
  if (!openHours || Object.keys(openHours).length === 0) {
    return "Часы уточняйте";
  }

  const values = Object.values(openHours).map((v) => v.trim()).filter(Boolean);
  if (values.length === 0) return "Часы уточняйте";

  const unique = [...new Set(values)];
  const sample = unique[0];

  if (unique.every((v) => /24\s*\/\s*7|круглосуточ/i.test(v) || v === "00:00-24:00")) {
    return "Круглосуточно";
  }

  // "09:00-22:00" → "с 09:00 до 22:00"
  const range = sample.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (range) {
    return `с ${range[1]} до ${range[2]}`;
  }

  // только конец дня
  const until = sample.match(/(?:до|until)\s*(\d{1,2}:\d{2})/i);
  if (until) {
    return `до ${until[1]}`;
  }

  return sample;
}

export function formatHoursUntilClose(
  openHours: Record<string, string> | null | undefined,
): string {
  const label = formatOpenHoursLabel(openHours);
  if (label.startsWith("с ") && label.includes(" до ")) {
    return `Работает ${label}`;
  }
  if (label === "Круглосуточно") return "Работает круглосуточно";
  if (label === "Часы уточняйте") return "Время работы уточняйте на месте";
  return `Работает ${label}`;
}
