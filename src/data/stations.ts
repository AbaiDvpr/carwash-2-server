export type StationKind = "wash" | "charging";

export type StationWasher = {
  id: number;
  status: string | null;
  statusLabel: string;
};

/** Сводка коннектора ЭЗС для списка / фильтров */
export type StationConnector = {
  slug: string;
  label: string;
  powerKw: number | null;
  status: string | null;
  photoUrl: string | null;
};

/** Конкретный пистолет/порт ЭЗС для карточки в drawer */
export type StationConnectorPort = {
  id: number;
  slug: string;
  label: string;
  powerKw: number | null;
  pricePerKwh: number | null;
  status: string | null;
  statusLabel: string;
  photoUrl: string | null;
  /** Если статус charging — процент заряда (0–100) */
  chargePercent?: number | null;
};

/** Стойка ЭЗС (charger) с коннекторами */
export type StationChargerStand = {
  id: number;
  index: number;
  title: string;
  type: string | null;
  powerKw: number | null;
  pricePerKwh: number | null;
  ports: StationConnectorPort[];
  /** Свой маршрут стойки; пусто → маршрут локации */
  map2gis?: string | null;
  mapYandex?: string | null;
};

export type Station = {
  id: string;
  name: string;
  address: string;
  status: "Открыто" | "Закрыто" | "Занято";
  /** Мойка или электростанция */
  kind: StationKind;
  /** Город локации (mdm_geos.id) */
  geoId: number | null;
  /** Фото локации; null → UI-заглушка */
  photoUrl: string | null;
  /** Например: «с 09:00 до 22:00» */
  hoursLabel: string;
  /** Сырой график по дням (mon/tue/…); для списка в drawer */
  openHours?: Record<string, string> | null;
  freeSlots: number;
  washersTotal: number;
  washers: StationWasher[];
  latitude: number;
  longitude: number;
  map_2gis: string;
  map_yandex: string;
  paymentSlug: string;
  paymentTitle: string;
  market: {
    id: string;
    name: string;
    description: string;
  }[];
  tariff: {
    id?: number;
    title: string;
    titleRu?: string | null;
    titleEn?: string | null;
    price: number;
    description: string;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
    /** Пункты состава (уже под локаль или raw) */
    items?: string[];
    composition?: { ru: string; en: string }[];
  }[];
  /** ЭЗС: макс. мощность среди зарядников, кВт */
  maxPowerKw?: number | null;
  /** ЭЗС / мойка: кол-во станций/постов на пине карты */
  stationsCount?: number | null;
  /** ЭЗС: цена за кВт·ч; null = неизвестна, 0 = бесплатно */
  pricePerKwh?: number | null;
  /** ЭЗС: есть DC / быстрые */
  hasDc?: boolean;
  /** ЭЗС: есть AC / медленные */
  hasAc?: boolean;
  /** ЭЗС: уникальные коннекторы для чипов и фильтра */
  connectors?: StationConnector[];
  /** ЭЗС: порты/пистолеты (плоско) */
  connectorPorts?: StationConnectorPort[];
  /** ЭЗС: стойки с коннекторами */
  chargerStands?: StationChargerStand[];
};

export function getPaymentPath(
  station: Station,
  tariffKey?: string | null,
): string {
  const path = `/payment/car-wash/${station.paymentSlug}`;
  if (!tariffKey) return path;
  return `${path}?tariff=${encodeURIComponent(tariffKey)}`;
}