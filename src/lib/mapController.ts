import { postToNative } from "./nativeBridge";

export type MapProvider = "yandex" | "2gis";

type OpenMapParams = {
  provider: MapProvider;
  lat: number;
  lng: number;
  /** Ссылка на здание/объект в Яндекс или 2ГИС */
  url?: string;
};

/**
 * Flutter: action "open_map", provider, url (здание), lat, lng (fallback)
 */
export function openMap({ provider, lat, lng, url }: OpenMapParams): void {
  const sent = postToNative({
    action: "open_map",
    provider,
    lat,
    lng,
    ...(url ? { url } : {}),
  });

  if (!sent) {
    const trimmedUrl = url?.trim();
    // Если URL пришёл пустым/null (часто из админки), всё равно открываем карту по координатам.
    const fallbackUrl =
      provider === "yandex"
        ? `https://yandex.kz/maps/?ll=${encodeURIComponent(`${lng},${lat}`)}&z=16`
        : `https://2gis.kz/geo/${lat},${lng}`;

    window.open(trimmedUrl || fallbackUrl, "_blank", "noopener,noreferrer");
  }
}

export function openYandexMap(lat: number, lng: number, url?: string): void {
  openMap({ provider: "yandex", lat, lng, url });
}

export function open2GisMap(lat: number, lng: number, url?: string): void {
  openMap({ provider: "2gis", lat, lng, url });
}
