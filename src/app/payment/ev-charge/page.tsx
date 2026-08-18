import { Suspense } from "react";
import EvChargePayment from "@/features/payment/components/EvChargePayment";

export default function EvChargePaymentPage() {
  return (
    <Suspense fallback={null}>
      <EvChargePayment />
    </Suspense>
  );
}
