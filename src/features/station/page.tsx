import type { Station } from "@/data/stations";
import StationDetail from "./components/StationDetail";

type StationPageProps = {
  station: Station;
};

export default function StationPage({ station }: StationPageProps) {
  return <StationDetail station={station} />;
}
