import type { Station } from "@/data/stations";
import CarWashPayment from "./components/CarWashPayment";

type PaymentPageProps = {
  station: Station;
};

export default function PaymentPage({ station }: PaymentPageProps) {
  return <CarWashPayment station={station} />;
}
