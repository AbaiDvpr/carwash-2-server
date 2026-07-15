import { apiFetch } from "@/lib/api";

export type Garage = {
  id: number;
  user_id: number;
  car_plate: string;
  pistol_type_id: number | null;
  created_at?: string;
  updated_at?: string;
};

type GaragesResponse = { garages: Garage[] };
type GarageResponse = { garage: Garage; message?: string };

export function fetchGarages(): Promise<Garage[]> {
  return apiFetch<GaragesResponse>("/api/garages").then((r) => r.garages);
}

export function createGarage(carPlate: string): Promise<Garage> {
  return apiFetch<GarageResponse>("/api/garages", {
    method: "POST",
    body: JSON.stringify({ car_plate: carPlate }),
  }).then((r) => r.garage);
}

export function updateGarage(id: number, carPlate: string): Promise<Garage> {
  return apiFetch<GarageResponse>(`/api/garages/${id}`, {
    method: "PUT",
    body: JSON.stringify({ car_plate: carPlate }),
  }).then((r) => r.garage);
}

export function deleteGarage(id: number): Promise<void> {
  return apiFetch<void>(`/api/garages/${id}`, {
    method: "DELETE",
  });
}
