import { notFound } from "next/navigation";
import StationPage from "@/features/station/page";
import { fetchCwStation } from "@/lib/api/cw";

type StationRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: StationRouteProps) {
  const { id } = await params;

  try {
    const station = await fetchCwStation(id);
    return <StationPage station={station} />;
  } catch {
    notFound();
  }
}
