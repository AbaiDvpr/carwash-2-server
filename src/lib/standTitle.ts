/** Локализованное имя стойки ЭЗС: «Станция №1» / «Station №1». */

type TFn = (key: string, fallback?: string) => string;

export function formatStandTitle(index: number, t: TFn): string {
  const n = Math.max(1, Math.floor(index));
  return t("map.stand_numbered", "Станция №{n}").replace("{n}", String(n));
}

/** Переводит уже сохранённый title вида «Станция №N» / «Station №N» под текущую локаль. */
export function localizeStandTitle(
  title: string | null | undefined,
  t: TFn,
  index?: number | null,
): string {
  if (index != null && Number.isFinite(index) && index > 0) {
    return formatStandTitle(Number(index), t);
  }
  const raw = (title ?? "").trim();
  if (!raw) return "—";
  const match = raw.match(
    /(?:станция|station|станция)\s*[№#]?\s*(\d+)/i,
  ) ?? raw.match(/[№#]\s*(\d+)/);
  if (match) {
    return formatStandTitle(Number(match[1]), t);
  }
  return raw;
}
