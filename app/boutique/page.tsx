import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CatalogImage from "@/components/CatalogImage";
import BoutiqueGrid from "@/components/BoutiqueGrid";
import { photoOf } from "@/lib/site-photos";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Boutique capillaire",
};

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  const catalog = await getPublicCatalog();
  const photos = catalog.photos;

  return (
    <main>
      <PageHero
        payments
        title="Boutique capillaire"
        subtitle="Payer par Wave, Max it ou Mixx. Tu récupères au salon, Nord Foire."
        image={photoOf(photos, "boutique")}
      />
      <section className="mx-auto max-w-[1100px] px-6 pb-12">
        <BoutiqueGrid products={catalog.products} categories={catalog.categories} />
      </section>
      <section className="mx-auto max-w-[1100px] px-6 pb-28">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden rounded-2xl">
            <CatalogImage
              src={photoOf(photos, "boutiqueDesk")}
              alt="Vitrine de la boutique MAC NATION"
              fill
              className="object-[50%_60%]"
            />
          </div>
          <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden rounded-2xl">
            <CatalogImage src={photoOf(photos, "boutiquePeople")} alt="Un client dans la boutique capillaire" fill />
          </div>
        </div>
      </section>
    </main>
  );
}
