export type AbonementKind = "ev" | "wash" | "combo";

export type AbonementCard = {
  id: string;
  kind: AbonementKind;
  title: string;
  subtitle: string;
  /** Остаток кВт·ч (ЭЗС / combo) */
  remainingKwh?: number;
  /** Лимит кВт·ч по абонементу */
  totalKwh?: number;
  /** Остаток моек (Мойка / combo) */
  remainingWashes?: number;
  /** Лимит моек по абонементу */
  totalWashes?: number;
  /** Сколько потратили с карты, ₸ */
  spentAmount: number;
  /** Маскированный номер карты для UI */
  cardNumber: string;
  /** Дедлайн подписки (ISO date) */
  deadline: string;
};

/** Оффер в каталоге покупки (mock) */
export type AbonementOffer = {
  id: string;
  kind: AbonementKind;
  title: string;
  subtitle: string;
  totalKwh?: number;
  totalWashes?: number;
  /** Цена покупки, ₸ */
  price: number;
  /** Срок действия в днях */
  validityDays: number;
};

/** Пока mock UI — без API */
export const ABONEMENT_CARDS: AbonementCard[] = [
  {
    id: "ev",
    kind: "ev",
    title: "ЭЗС",
    subtitle: "Только зарядка",
    remainingKwh: 148.5,
    totalKwh: 200,
    spentAmount: 32_400,
    cardNumber: "4863 0000 0000 1201",
    deadline: "2026-12-31",
  },
  {
    id: "wash",
    kind: "wash",
    title: "Мойка",
    subtitle: "Только мойка",
    remainingWashes: 12,
    totalWashes: 20,
    spentAmount: 18_900,
    cardNumber: "4863 0000 0000 2202",
    deadline: "2026-09-15",
  },
  {
    id: "combo",
    kind: "combo",
    title: "Мойка + ЭЗС",
    subtitle: "Общая карта",
    remainingKwh: 86,
    totalKwh: 150,
    remainingWashes: 7,
    totalWashes: 15,
    spentAmount: 54_750,
    cardNumber: "4863 0000 0000 3303",
    deadline: "2027-03-01",
  },
];

/** Каталог для покупки — фронт-заглушка */
export const ABONEMENT_OFFERS: AbonementOffer[] = [
  {
    id: "offer-ev-100",
    kind: "ev",
    title: "ЭЗС 100",
    subtitle: "100 кВт·ч на зарядку",
    totalKwh: 100,
    price: 18_000,
    validityDays: 90,
  },
  {
    id: "offer-ev-200",
    kind: "ev",
    title: "ЭЗС 200",
    subtitle: "200 кВт·ч на зарядку",
    totalKwh: 200,
    price: 32_000,
    validityDays: 180,
  },
  {
    id: "offer-wash-10",
    kind: "wash",
    title: "Мойка 10",
    subtitle: "10 моек",
    totalWashes: 10,
    price: 12_000,
    validityDays: 90,
  },
  {
    id: "offer-wash-20",
    kind: "wash",
    title: "Мойка 20",
    subtitle: "20 моек",
    totalWashes: 20,
    price: 21_000,
    validityDays: 180,
  },
  {
    id: "offer-combo",
    kind: "combo",
    title: "Мойка + ЭЗС",
    subtitle: "150 кВт·ч и 15 моек",
    totalKwh: 150,
    totalWashes: 15,
    price: 48_000,
    validityDays: 365,
  },
];

export function getAbonementById(id: string): AbonementCard | null {
  return ABONEMENT_CARDS.find((card) => card.id === id) ?? null;
}

export function getAbonementOfferById(id: string): AbonementOffer | null {
  return ABONEMENT_OFFERS.find((offer) => offer.id === id) ?? null;
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

/** Доля остатка 0..1 для прогресс-бара */
export function abonementProgress(remaining: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, remaining / total));
}

export function abonementKindClass(kind: AbonementKind): string {
  if (kind === "ev") return "abonement-plastic--ev";
  if (kind === "wash") return "abonement-plastic--wash";
  return "abonement-plastic--combo";
}

export function abonementKindSuffix(kind: AbonementKind): string {
  if (kind === "ev") return "EV";
  if (kind === "wash") return "WASH";
  return "PLUS";
}
