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

export function getAbonementById(id: string): AbonementCard | null {
  return ABONEMENT_CARDS.find((card) => card.id === id) ?? null;
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
