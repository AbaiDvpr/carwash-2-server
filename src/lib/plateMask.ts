/**
 * Маска госномера KZ (физлица):
 *  - 000 AA 00   (3 цифры + 2 буквы + регион)
 *  - 000 AAA 00  (3 цифры + 3 буквы + регион)
 */

/** Оставить только латиницу и цифры, upper-case */
export function sanitizePlateRaw(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Применяет маску по мере ввода.
 * Возвращает отображаемую строку с пробелами: "237 BLM 01"
 */
export function applyKzPlateMask(value: string): string {
  const raw = sanitizePlateRaw(value);
  let digits = "";
  let letters = "";
  let region = "";

  for (const ch of raw) {
    if (digits.length < 3) {
      if (/\d/.test(ch)) digits += ch;
      continue;
    }

    if (letters.length < 3 && /[A-Z]/.test(ch)) {
      letters += ch;
      continue;
    }

    // после минимум 2 букв можно вводить регион
    if (letters.length >= 2 && region.length < 2 && /\d/.test(ch)) {
      region += ch;
    }
  }

  return [digits, letters, region].filter(Boolean).join(" ");
}

/** Нормализованный номер без пробелов для сохранения: "237BLM01" */
export function normalizePlate(value: string): string {
  return sanitizePlateRaw(value);
}

/** Валидна ли маска (полный номер 2 или 3 буквы) */
export function isCompleteKzPlate(value: string): boolean {
  const raw = normalizePlate(value);
  return /^\d{3}[A-Z]{2,3}\d{2}$/.test(raw);
}

export function formatPlateDisplay(value: string): string {
  const raw = normalizePlate(value);
  if (/^\d{3}[A-Z]{2}\d{2}$/.test(raw)) {
    return `${raw.slice(0, 3)} ${raw.slice(3, 5)} ${raw.slice(5)}`;
  }
  if (/^\d{3}[A-Z]{3}\d{2}$/.test(raw)) {
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
  }
  return value;
}
