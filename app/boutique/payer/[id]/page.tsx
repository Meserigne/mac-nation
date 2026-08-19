import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import CatalogImage from "@/components/CatalogImage";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Payer un produit",
};

export const dynamic = "force-dynamic";

export default async function BoutiquePayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getPublicCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) notFound();

  return (
    <main className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <Link href="/boutique" className="text-sm text-gray-500 hover:text-white">
          ← Boutique
        </Link>
        <div className="relative mt-5 aspect-square overflow-hidden rounded-2xl bg-black">
          <CatalogImage src={product.image} alt={product.name} className="absolute inset-0" />
        </div>
        <p className="mt-4 text-sm text-gray-400">{product.description}</p>
        <p className="mt-2 text-sm text-gray-500">Retrait au salon, {catalog.site.city}.</p>
      </div>
      <CheckoutForm
        kind="boutique"
        itemId={product.id}
        title={product.name}
        amount={product.priceFcfa}
        showQty
        hint="Payer maintenant. On prépare le produit, tu le récupères au salon."
      />
    </main>
  );
}
