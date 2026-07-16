import PaymentRoute from "@/features/payment/PaymentRoute";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <PaymentRoute slug={slug} />;
}
