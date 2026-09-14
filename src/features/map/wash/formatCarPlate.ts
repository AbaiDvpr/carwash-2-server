/** 111AAA02 → 111 AAA 02 */
export function formatCarPlate(value: string | null | undefined): string {
  if (!value) return "";
  const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  let out = "";
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (i > 0) {
      const prev = clean[i - 1]!;
      const prevDigit = prev >= "0" && prev <= "9";
      const curDigit = ch >= "0" && ch <= "9";
      if (prevDigit !== curDigit) out += " ";
    }
    out += ch;
  }
  return out;
}
