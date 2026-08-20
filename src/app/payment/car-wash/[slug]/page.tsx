import PaymentRoute from "@/features/payment/PaymentRoute";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tariff?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const tariff =
    typeof query.tariff === "string" ? query.tariff : query.tariff?.[0] ?? null;
  return <PaymentRoute slug={slug} tariff={tariff} />;
}
