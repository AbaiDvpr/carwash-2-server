/** Фильтр города в списке точек: все города или geo_id. */

export const LIST_CITY_FILTER_KEY = "list_city_filter";

export type ListCityFilter = "all" | number;

export function parseListCityFilter(raw: string | null): ListCityFilter | null {
  if (raw == null || raw === "") return null;
  if (raw === "all") return "all";
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export function readListCityFilter(): ListCityFilter | null {
  if (typeof window === "undefined") return null;
  return parseListCityFilter(window.localStorage.getItem(LIST_CITY_FILTER_KEY));
}

export function writeListCityFilter(filter: ListCityFilter): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LIST_CITY_FILTER_KEY,
    filter === "all" ? "all" : String(filter),
  );
}

/**
 * Сохранённый фильтр, если валиден; иначе город профиля; иначе «все».
 * `knownGeoIds` — id из справочника (чтобы отбросить устаревший geo_id).
 */
export function resolveListCityFilter(
  stored: ListCityFilter | null,
  profileGeoId: number | null,
  knownGeoIds?: number[],
): ListCityFilter {
  if (stored === "all") return "all";
  if (typeof stored === "number") {
    if (!knownGeoIds?.length || knownGeoIds.includes(stored)) {
      return stored;
    }
  }
  if (profileGeoId != null) return profileGeoId;
  return "all";
}
