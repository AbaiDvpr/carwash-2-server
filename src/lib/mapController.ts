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

  if (!sent && url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function openYandexMap(lat: number, lng: number, url?: string): void {
  openMap({ provider: "yandex", lat, lng, url });
}

export function open2GisMap(lat: number, lng: number, url?: string): void {
  openMap({ provider: "2gis", lat, lng, url });
}
