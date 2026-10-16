import { apiFetch } from "@/lib/api";
import type { PlateType } from "@/lib/api/garage";

export type GarageV2PowerType = "fuel" | "electric" | "hybrid";

export type GarageV2PistolType = {
  id: number;
  type: string;
  photo_url: string | null;
};

export type GarageV2FuelType = {
  id: number;
  code: string;
  name: string;
  group: "gasoline" | "other" | string;
  sort_order?: number;
};

export type GarageV2 = {
  id: number;
  user_id: number;
  car_plate: string;
  plate_type_id: number | null;
  power_type: GarageV2PowerType;
  pistol_type_id: number | null;
  pistol_type: GarageV2PistolType | null;
  fuel_type_id: number | null;
  fuel_type_2_id?: number | null;
  fuel_type: GarageV2FuelType | null;
  fuel_type_2?: GarageV2FuelType | null;
  fuel_types?: GarageV2FuelType[];
  plate_type?: PlateType | null;
  /** Лимит на мойку за календарный месяц (юрлицо), ₸ */
  spend_month?: number | null;
  on_territory?: boolean;
  created_at?: string;
  updated_at?: string;
};

type GaragesResponse = {
  garages: GarageV2[];
  requires_spend_limits?: boolean;
  person_type?: string;
};
type GarageResponse = { garage: GarageV2; message?: string };
type PistolTypesResponse = { pistol_types: GarageV2PistolType[] };
type FuelTypesResponse = { fuel_types: GarageV2FuelType[] };

export type GaragesV2Result = {
  garages: GarageV2[];
  requiresSpendLimits: boolean;
  personType: string;
};

export type GarageV2Input = {
  car_plate: string;
  power_type: GarageV2PowerType;
  pistol_type_id?: number | null;
  fuel_type_id?: number | null;
  /** До двух типов. У гибрида: газ + бензин (80–100) или газ + дизель. */
  fuel_type_ids?: number[];
  plate_type_id?: number | null;
  /** Обязателен для юрлица: лимит на мойку за календарный месяц */
  spend_month?: number | null;
};

export function fetchGarageV2PistolTypes(): Promise<GarageV2PistolType[]> {
  return apiFetch<PistolTypesResponse>("/api/garage/v2/pistol-types").then(
    (r) => r.pistol_types,
  );
}

export function fetchGarageV2FuelTypes(): Promise<GarageV2FuelType[]> {
  return apiFetch<FuelTypesResponse>("/api/garage/v2/fuel-types").then(
    (r) => r.fuel_types,
  );
}

export function fetchGaragesV2(): Promise<GarageV2[]> {
  return fetchGaragesV2Detailed().then((r) => r.garages);
}

export function fetchGaragesV2Detailed(): Promise<GaragesV2Result> {
  return apiFetch<GaragesResponse>("/api/garage/v2/").then((r) => ({
    garages: r.garages,
    requiresSpendLimits: Boolean(r.requires_spend_limits),
    personType: r.person_type ?? "individual",
  }));
}

export function createGarageV2(input: GarageV2Input): Promise<GarageV2> {
  return apiFetch<GarageResponse>("/api/garage/v2/", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.garage);
}

export function updateGarageV2(
  id: number,
  input: GarageV2Input,
): Promise<GarageV2> {
  return apiFetch<GarageResponse>(`/api/garage/v2/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((r) => r.garage);
}

export function deleteGarageV2(id: number): Promise<void> {
  return apiFetch<void>(`/api/garage/v2/${id}`, {
    method: "DELETE",
  });
}
