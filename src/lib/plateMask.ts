/**
 * Маски госномеров по типам (mdm_plate_types.code).
 *
 * kz_new  — 000 AAA 00   (новый KZ)
 * kz_old  — A 000 AAA    (старый KZ, напр. Z 001 AST)
 * ru      — A 000 AA 00
 * am      — 00 AA 000
 * ge      — AA 000 AA
 * cn      — A A00000
 * kg      — 00 000 AAA
 * tj      — 0000 AA 00
 * other   — свободный ввод
 */

export type PlateTypeCode =
  | "kz_new"
  | "kz_old"
  | "ru"
  | "am"
  | "ge"
  | "cn"
  | "kg"
  | "tj"
  | "other";

export type PlateCountryCode =
  | "kz"
  | "ru"
  | "am"
  | "ge"
  | "cn"
  | "kg"
  | "tj"
  | "other";

export type PlateTypeDef = {
  code: PlateTypeCode;
  country_code: PlateCountryCode;
  name: string;
  mask: string;
  example: string | null;
  flag: string;
};

/** Оставить латиницу + цифры, upper-case */
export function sanitizePlateRaw(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizePlate(value: string): string {
  return sanitizePlateRaw(value);
}

function take(
  raw: string,
  i: { n: number },
  count: number,
  kind: "digit" | "letter",
): string {
  let out = "";
  const re = kind === "digit" ? /\d/ : /[A-Z]/;
  while (out.length < count && i.n < raw.length) {
    const ch = raw[i.n]!;
    i.n += 1;
    if (re.test(ch)) out += ch;
  }
  return out;
}

/** Новый KZ: 000 AA(A) 00 */
export function applyKzNewMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const digits = take(raw, i, 3, "digit");
  const letters = take(raw, i, 3, "letter");
  const region =
    letters.length >= 2 ? take(raw, i, 2, "digit") : "";
  return [digits, letters, region].filter(Boolean).join(" ");
}

/** Старый KZ: A 000 AAA  (Z 001 AST) */
export function applyKzOldMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const series = take(raw, i, 1, "letter");
  const digits = take(raw, i, 3, "digit");
  const region = take(raw, i, 3, "letter");
  return [series, digits, region].filter(Boolean).join(" ");
}

/** Россия: A 000 AA 00(0) */
export function applyRuMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const l1 = take(raw, i, 1, "letter");
  const d3 = take(raw, i, 3, "digit");
  const l2 = take(raw, i, 2, "letter");
  const region = take(raw, i, 3, "digit");
  return [l1, d3, l2, region].filter(Boolean).join(" ");
}

/** Армения: 00 AA 000 */
export function applyAmMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const d2 = take(raw, i, 2, "digit");
  const l2 = take(raw, i, 2, "letter");
  const d3 = take(raw, i, 3, "digit");
  return [d2, l2, d3].filter(Boolean).join(" ");
}

/** Грузия: AA 000 AA */
export function applyGeMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const l2a = take(raw, i, 2, "letter");
  const d3 = take(raw, i, 3, "digit");
  const l2b = take(raw, i, 2, "letter");
  return [l2a, d3, l2b].filter(Boolean).join(" ");
}

/** Китай (латиница): A A00000 */
export function applyCnMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const l1 = take(raw, i, 1, "letter");
  const l2 = take(raw, i, 1, "letter");
  const d5 = take(raw, i, 5, "digit");
  if (!l1) return "";
  if (!l2) return l1;
  return `${l1} ${l2}${d5}`;
}

/** Кыргызстан: 00 000 AAA */
export function applyKgMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const region = take(raw, i, 2, "digit");
  const digits = take(raw, i, 3, "digit");
  const letters = take(raw, i, 3, "letter");
  return [region, digits, letters].filter(Boolean).join(" ");
}

/** Таджикистан: 0000 AA 00 */
export function applyTjMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  const i = { n: 0 };
  const digits = take(raw, i, 4, "digit");
  const letters = take(raw, i, 2, "letter");
  const region = take(raw, i, 2, "digit");
  return [digits, letters, region].filter(Boolean).join(" ");
}

export function applyPlateMask(code: PlateTypeCode | string, value: string): string {
  switch (code) {
    case "kz_new":
      return applyKzNewMask(value);
    case "kz_old":
      return applyKzOldMask(value);
    case "ru":
      return applyRuMask(value);
    case "am":
      return applyAmMask(value);
    case "ge":
      return applyGeMask(value);
    case "cn":
      return applyCnMask(value);
    case "kg":
      return applyKgMask(value);
    case "tj":
      return applyTjMask(value);
    case "other":
    default:
      return sanitizePlateRaw(value).slice(0, 16);
  }
}

export function formatPlateDisplay(
  value: string,
  code?: PlateTypeCode | string | null,
): string {
  if (code) return applyPlateMask(code, value);
  const raw = normalizePlate(value);
  // эвристика для старых сохранённых номеров
  if (/^\d{3}[A-Z]{2,3}\d{2}$/.test(raw)) return applyKzNewMask(raw);
  if (/^[A-Z]\d{3}[A-Z]{3}$/.test(raw)) return applyKzOldMask(raw);
  return value;
}

export function plateMaxLength(code: PlateTypeCode | string): number {
  switch (code) {
    case "kz_new":
      return 12;
    case "kz_old":
      return 11;
    case "ru":
      return 13;
    case "am":
      return 10;
    case "ge":
      return 10;
    case "cn":
      return 9;
    case "kg":
      return 12;
    case "tj":
      return 12;
    default:
      return 16;
  }
}

/** @deprecated alias */
export const applyKzPlateMask = applyKzNewMask;

export function isCompleteKzPlate(value: string): boolean {
  const raw = normalizePlate(value);
  return /^\d{3}[A-Z]{2,3}\d{2}$/.test(raw);
}
