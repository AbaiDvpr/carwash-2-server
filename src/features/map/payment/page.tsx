import type { Station } from "@/data/stations";
import CarWashPayment from "./components/CarWashPayment";

type PaymentPageProps = {
  station: Station;
  tariff?: string | null;
};

export default function PaymentPage({ station, tariff = null }: PaymentPageProps) {
  return <CarWashPayment station={station} tariff={tariff} />;
}
