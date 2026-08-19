import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Payer un abonnement",
};

export const dynamic = "force-dynamic";

export default async function AbonnementPayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getPublicCatalog();
  const plan = catalog.plans.find((item) => item.id === id);
  if (!plan) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Link href="/abonnements" className="text-sm text-gray-500 hover:text-white">
        ← Abonnements
      </Link>
      <ul className="mt-8 mb-8 space-y-2 text-sm text-gray-400">
        {plan.points.map((point) => (
          <li key={point}>· {point}</li>
        ))}
      </ul>
      <CheckoutForm
        kind="abonnement"
        itemId={plan.id}
        title={plan.name}
        amount={plan.priceFcfa}
        hint={`${plan.period}. Valable à ${catalog.site.city}. Les visites non utilisées ne se reportent pas.`}
      />
    </main>
  );
}
