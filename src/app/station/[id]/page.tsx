import StationPage from "@/features/map/station/page";

type StationRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: StationRouteProps) {
  const { id } = await params;
  return <StationPage id={id} />;
}
