import DetailsChargingPage from "@/features/charging/DetailsChargingPage";

type DetailsChargingRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: DetailsChargingRouteProps) {
  const { id } = await params;
  return <DetailsChargingPage id={id} />;
}
