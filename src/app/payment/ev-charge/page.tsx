import { Suspense } from "react";
import EvChargePayment from "@/features/map/payment/components/EvChargePayment";

export default function EvChargePaymentPage() {
  return (
    <Suspense fallback={null}>
      <EvChargePayment />
    </Suspense>
  );
}
