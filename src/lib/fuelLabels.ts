import type { GarageV2FuelType } from "@/lib/api/garageV2";

type TFn = (key: string, fallback?: string) => string;

/** Локализует название топлива из MDM (газ / дизель / другое / АИ-*). */
export function fuelTypeLabel(
  type: Pick<GarageV2FuelType, "code" | "name" | "group"> | null | undefined,
  t: TFn,
): string {
  if (!type) return t("garage2.fuel", "Топливо");
  if (type.group === "gasoline") {
    return type.code.toUpperCase();
  }
  const code = type.code.toLowerCase();
  if (code === "diesel") return t("fuel.diesel", "Дизель");
  if (code === "gas") return t("fuel.gas", "Газ");
  if (code === "other") return t("fuel.other", "Другое");
  return type.name;
}
