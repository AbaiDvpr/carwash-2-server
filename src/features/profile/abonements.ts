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

export function formatKwh(value: number): string {
  const text =
    Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.05
      ? String(Math.round(value))
      : value.toFixed(1).replace(".", ",");
  return `${text} кВт·ч`;
}

export function formatAbonementDeadline(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAbonementDeadlineShort(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

export function formatValidityDays(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365;
    return y === 1 ? "1 год" : `${y} года`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return `${m} мес.`;
  }
  return `${days} дн.`;
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
