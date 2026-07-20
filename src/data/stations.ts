export type StationKind = "wash" | "charging";

export type StationWasher = {
  id: number;
  status: string | null;
  statusLabel: string;
};

export type Station = {
  id: string;
  name: string;
  address: string;
  status: "Открыто" | "Закрыто";
  /** Мойка или электростанция */
  kind: StationKind;
  /** Город локации (mdm_geos.id) */
  geoId: number | null;
  /** Фото локации; null → UI-заглушка */
  photoUrl: string | null;
  /** Например: «с 09:00 до 22:00» */
  hoursLabel: string;
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
    price: number;
    description: string;
  }[];
};

export const STATIONS: Station[] = [
  {
    id: "dostyk",
    name: "CarWash Seifulina",
    address: "Сакен Сейфуллин, 11/2",
    status: "Открыто",
    kind: "wash",
    geoId: null,
    photoUrl: null,
    hoursLabel: "с 09:00 до 22:00",
    freeSlots: 2,
    washersTotal: 2,
    washers: [],
    latitude: 51.169752,
    longitude: 71.412575,
    map_2gis:
      "https://2gis.kz/astana/geo/9570784863333666/71.409519%2C51.170866?m=71.412575%2C51.169752%2F16.54",
    map_yandex:
      "https://yandex.kz/maps/163/astana/house/saken_seyfullin_koshesi_11_2/Y0gYcgdpSkACQFtrfX12cXRkZA==/?ll=71.409354%2C51.170870&z=17",
    paymentSlug: "Seifluina",
    paymentTitle: "Сейфулина",
    market: [
      {
        id: "market_1",
        name: "Маркет 1",
        description: "Маркет 1",
      },
      {
        id: "market_2",
        name: "Маркет 2",
        description: "Маркет 2",
      }
    ],
    tariff: [
      {
        title: "Тариф 1",
        price: 1003,
        description: "Тариф 1",
      },
      {
        title: "Тариф 2",
        price: 2003,
        description: "Тариф 2",
      },
      {
        title: "Тариф 3",
        price: 3003,
        description: "Тариф 3",
      },
    ],
  },
  {
    id: "esentai",
    name: "CarWash Sauran",
    address: "Сауран, 18/1",
    status: "Открыто",
    kind: "wash",
    geoId: null,
    photoUrl: null,
    hoursLabel: "с 09:00 до 22:00",
    freeSlots: 1,
    washersTotal: 1,
    washers: [],
    latitude: 51.112897,
    longitude: 71.417429,
    map_2gis:
      "https://2gis.kz/astana/geo/9570784863332877/71.418008%2C51.112608?m=71.417359%2C51.11224%2F17.96",
    map_yandex:
      "https://yandex.kz/maps/163/astana/house/sauran_koshesi_18_1/Y0gYcgZnTkUOQFtrfX1wcn5ibQ==/?ll=71.417709%2C51.113219&z=17",
    paymentSlug: "Sauran",
    paymentTitle: "Сауран",
    market: [
      {
        id: "market_1",
        name: "Маркет 1",
        description: "Маркет 1",
      },
      {
        id: "market_2",
        name: "Маркет 2",
        description: "Маркет 2",
      }
    ],
    tariff: [
      {
        title: "Тариф 1",
        price: 1002,
        description: "Тариф 1",
      },
      {
        title: "Тариф 2",
        price: 2002,
        description: "Тариф 2",
      },
      {
        title: "Тариф 3",
        price: 3002,
        description: "Тариф 3",
      },
    ],
  },
  {
    id: "samal",
    name: "CarWash Uly dala",
    address: "Қабанбай батыр, 51",
    status: "Закрыто",
    kind: "wash",
    geoId: null,
    photoUrl: null,
    hoursLabel: "с 09:00 до 22:00",
    freeSlots: 0,
    washersTotal: 0,
    washers: [],
    latitude: 51.0954,
    longitude: 71.3912,
    map_2gis:
      "https://2gis.kz/astana/geo/70030076214794231/71.404574%2C51.099315?m=71.406637%2C51.098834%2F17.28",
    map_yandex:
      "https://yandex.kz/maps/163/astana/house/qabanbay_batyr_dangghyly_51/Y0gYcgdkQUcAQFtrfXx4eH9nYw==/?ll=71.405063%2C51.099656&z=17.68",
    paymentSlug: "UlyDala",
    paymentTitle: "Улы дала",
    market: [
      {
        id: "market_1",
        name: "Маркет 1",
        description: "Маркет 1",
      },
      {
        id: "market_2",
        name: "Маркет 2",
        description: "Маркет 2",
      }
    ],
    tariff: [
      {
        title: "Тариф 1",
        price: 1001,
        description: "Тариф 1",
      },
      {
        title: "Тариф 2",
        price: 2001,
        description: "Тариф 2",
      },
      {
        title: "Тариф 3",
        price: 3001,
        description: "Тариф 3",
      },
    ],
  },
];

export function getStationById(id: string): Station | undefined {
  return STATIONS.find((station) => station.id === id);
}

export function getStationByPaymentSlug(slug: string): Station | undefined {
  return STATIONS.find((station) => station.paymentSlug === slug);
}

export function getPaymentPath(station: Station): string {
  return `/payment/car-wash/${station.paymentSlug}`;
}