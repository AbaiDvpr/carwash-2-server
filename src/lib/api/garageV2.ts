import { apiFetch } from "@/lib/api";
import type { PlateType } from "@/lib/api/garage";

export type GarageV2PowerType = "fuel" | "electric";

export type GarageV2PistolType = {
  id: number;
  type: string;
  photo_url: string | null;
};

export type GarageV2 = {
  id: number;
  user_id: number;
  car_plate: string;
  plate_type_id: number | null;
  power_type: GarageV2PowerType;
  pistol_type_id: number | null;
  pistol_type: GarageV2PistolType | null;
  plate_type?: PlateType | null;
  created_at?: string;
  updated_at?: string;
};

type GaragesResponse = { garages: GarageV2[] };
type GarageResponse = { garage: GarageV2; message?: string };
type PistolTypesResponse = { pistol_types: GarageV2PistolType[] };

export type GarageV2Input = {
  car_plate: string;
  power_type: GarageV2PowerType;
  pistol_type_id?: number | null;
  plate_type_id?: number | null;
};

export function fetchGarageV2PistolTypes(): Promise<GarageV2PistolType[]> {
  return apiFetch<PistolTypesResponse>("/api/garage/v2/pistol-types").then(
    (r) => r.pistol_types,
  );
}

export function fetchGaragesV2(): Promise<GarageV2[]> {
  return apiFetch<GaragesResponse>("/api/garage/v2/").then((r) => r.garages);
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
