import { apiFetch } from "@/lib/api";
import type { PlateTypeCode } from "@/lib/plateMask";

export type PlateType = {
  id: number;
  country_code: string;
  code: PlateTypeCode | string;
  name: string;
  mask: string;
  example: string | null;
  flag: string;
  sort_order: number;
};

export type Garage = {
  id: number;
  user_id: number;
  car_plate: string;
  plate_type_id: number | null;
  pistol_type_id: number | null;
  plate_type?: PlateType | null;
  created_at?: string;
  updated_at?: string;
};

type GaragesResponse = { garages: Garage[] };
type GarageResponse = { garage: Garage; message?: string };
type PlateTypesResponse = { plate_types: PlateType[] };

export function fetchPlateTypes(): Promise<PlateType[]> {
  return apiFetch<PlateTypesResponse>("/api/plate-types").then(
    (r) => r.plate_types,
  );
}

export function fetchGarages(): Promise<Garage[]> {
  return apiFetch<GaragesResponse>("/api/garages").then((r) => r.garages);
}

export function createGarage(input: {
  car_plate: string;
  plate_type_id?: number | null;
}): Promise<Garage> {
  return apiFetch<GarageResponse>("/api/garages", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.garage);
}

export function updateGarage(
  id: number,
  input: { car_plate: string; plate_type_id?: number | null },
): Promise<Garage> {
  return apiFetch<GarageResponse>(`/api/garages/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((r) => r.garage);
}

export function deleteGarage(id: number): Promise<void> {
  return apiFetch<void>(`/api/garages/${id}`, {
    method: "DELETE",
  });
}
