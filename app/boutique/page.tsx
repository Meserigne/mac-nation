import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import BoutiqueGrid from "@/components/BoutiqueGrid";
import { pageImages, people, photos } from "@/lib/assets";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Boutique capillaire",
};

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  const catalog = await getPublicCatalog();

  return (
    <main>
      <PageHero
        kicker="Wave · Orange Money · Free Money"
        title="Boutique capillaire"
        subtitle="Payer par Wave, Orange Money ou Free Money. Tu récupères au salon, Nord Foire."
        image={pageImages.boutique}
      />
      <section className="mx-auto max-w-[1100px] px-6 pb-12">
        <BoutiqueGrid products={catalog.products} categories={catalog.categories} />
      </section>
      <section className="mx-auto max-w-[1100px] px-6 pb-28">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden rounded-2xl">
            <Image
              src={photos.boutiqueDesk}
              alt="Vitrine de la boutique MAC NATION"
              fill
              className="object-cover object-[50%_60%]"
              sizes="50vw"
            />
          </div>
          <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden rounded-2xl">
            <Image
              src={people.boutique}
              alt="Un client dans la boutique capillaire"
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
