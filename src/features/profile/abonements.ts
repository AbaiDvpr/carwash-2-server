import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/lib/api/auth";

export type AbonementKind = "ev" | "wash";

export type AbonementCard = {
  id: string;
  kind: AbonementKind;
  title: string;
  subtitle: string;
  remainingKwh?: number | null;
  totalKwh?: number | null;
  remainingWashes?: number | null;
  totalWashes?: number | null;
  spentAmount: number;
  cardNumber: string;
  deadline: string;
};

export type AbonementOffer = {
  id: string;
  kind: AbonementKind;
  title: string;
  subtitle: string;
  totalKwh?: number | null;
  totalWashes?: number | null;
  price: number;
  validityDays: number;
};

type ListResponse<T> = { data: T[] };
type OneResponse<T> = { data: T };

export async function fetchAbonementOffers(): Promise<AbonementOffer[]> {
  const res = await apiFetch<ListResponse<AbonementOffer>>("/api/abonements/offers");
  return res.data ?? [];
}

export async function fetchAbonementCards(): Promise<AbonementCard[]> {
  const res = await apiFetch<ListResponse<AbonementCard>>("/api/abonements/cards");
  return res.data ?? [];
}

export async function fetchAbonementCard(id: string): Promise<AbonementCard> {
  const res = await apiFetch<OneResponse<AbonementCard>>(
    `/api/abonements/cards/${encodeURIComponent(id)}`,
  );
  return res.data;
}

export async function buyAbonementOffer(offerId: string): Promise<{
  message: string;
  balance: string | number;
  card: AbonementCard;
  user: AuthUser;
}> {
  const data = await apiFetch<{
    message: string;
    balance: string | number;
    card: AbonementCard;
    user: AuthUser;
  }>("/api/abonements/buy", {
    method: "POST",
    body: JSON.stringify({ offer_id: Number(offerId) }),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
  return data;
}

/** Активные карты, подходящие для мойки */
export function washAbonements(cards: AbonementCard[]): AbonementCard[] {
  return cards.filter(
    (c) =>
      c.kind === "wash" &&
      (c.remainingWashes ?? 0) > 0 &&
      !isAbonementExpired(c.deadline),
  );
}

/** Активные карты, подходящие для ЭЗС (с остатком кВт·ч) */
export function evAbonements(cards: AbonementCard[]): AbonementCard[] {
  return cards.filter(
    (c) =>
      c.kind === "ev" &&
      (c.remainingKwh ?? 0) > 0 &&
      !isAbonementExpired(c.deadline),
  );
}

export function formatAbonementMoney(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

export function formatKwhAmount(value: number): string {
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.05) {
    return String(Math.round(value));
  }
  return value.toFixed(1).replace(".", ",");
}

type TFn = (key: string, fallback?: string) => string;

export function formatKwh(value: number, t?: TFn): string {
  const amount = formatKwhAmount(value);
  if (t) {
    return t("units.kwh_amount", "{n} кВт·ч").replace("{n}", amount);
  }
  return `${amount} кВт·ч`;
}

/** Единый формат: «100 / 200 кВт·ч» — единица один раз */
export function formatKwhRange(
  remaining: number,
  total: number,
  t?: TFn,
): string {
  const left = formatKwhAmount(remaining);
  const right = formatKwhAmount(total);
  if (t) {
    return t("units.kwh_range", "{a} / {b} кВт·ч")
      .replace("{a}", left)
      .replace("{b}", right);
  }
  return `${left} / ${right} кВт·ч`;
}

export function formatAbonementDeadline(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

export function formatAbonementDeadlineShort(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

export function formatValidityDays(days: number, t?: TFn): string {
  if (days % 365 === 0) {
    const y = days / 365;
    if (t) {
      return y === 1
        ? t("profile.validity_year", "1 год")
        : t("profile.validity_years", "{n} года").replace("{n}", String(y));
    }
    return y === 1 ? "1 год" : `${y} года`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    if (t) {
      return t("profile.validity_months", "{n} мес.").replace("{n}", String(m));
    }
    return `${m} мес.`;
  }
  if (t) {
    return t("profile.validity_days", "{n} дн.").replace("{n}", String(days));
  }
  return `${days} дн.`;
}

/** Подзаголовок пакета по kind + объёму (не сырой subtitle с бэка). */
export function formatAbonementSubtitle(
  item: {
    kind: AbonementKind;
    totalKwh?: number | null;
    totalWashes?: number | null;
  },
  t: TFn,
): string {
  if (item.kind === "ev") {
    return t("profile.abonement_subtitle_ev", "{n} кВт·ч на зарядку").replace(
      "{n}",
      formatKwhAmount(item.totalKwh ?? 0),
    );
  }
  return t("profile.abonement_subtitle_wash", "{n} моек").replace(
    "{n}",
    String(item.totalWashes ?? 0),
  );
}

export function usedAbonementVolume(card: AbonementCard): number {
  if (card.kind === "ev") {
    const used = (card.totalKwh ?? 0) - (card.remainingKwh ?? 0);
    return Math.max(0, Math.round(used * 100) / 100);
  }
  const used = (card.totalWashes ?? 0) - (card.remainingWashes ?? 0);
  return Math.max(0, Math.round(used));
}

/** Сколько уже использовано с карты: кВт·ч или мойки, без тенге. */
export function formatAbonementUsed(card: AbonementCard, t: TFn): string {
  const used = usedAbonementVolume(card);
  if (card.kind === "ev") {
    return formatKwh(used, t);
  }
  return t("profile.abonement_subtitle_wash", "{n} моек").replace(
    "{n}",
    String(used),
  );
}

export function isAbonementExpired(isoDate: string): boolean {
  const date = new Date(`${isoDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function abonementProgress(remaining: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, remaining / total));
}

export function abonementKindClass(kind: AbonementKind): string {
  if (kind === "ev") return "abonement-plastic--ev";
  return "abonement-plastic--wash";
}

export function abonementKindSuffix(kind: AbonementKind): string {
  if (kind === "ev") return "EV";
  return "WASH";
}
