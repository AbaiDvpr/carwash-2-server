import { notFound } from "next/navigation";
import PaymentPage from "@/features/payment/page";
import { getStationByPaymentSlug } from "@/data/stations";

type PaymentPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PaymentPageProps) {
  const { slug } = await params;
  const station = getStationByPaymentSlug(slug);

  if (!station) {
    notFound();
  }

  return <PaymentPage station={station} />;
}
