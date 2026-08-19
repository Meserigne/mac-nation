import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CatalogImage from "@/components/CatalogImage";
import BookingForm from "@/components/BookingForm";
import { photoOf } from "@/lib/site-photos";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Prendre rendez-vous",
};

export const dynamic = "force-dynamic";

export default async function RendezVousPage() {
  const catalog = await getPublicCatalog();
  const photos = catalog.photos;
  return (
    <main>
      <PageHero
        title="Prendre rendez-vous"
        subtitle="Choisissez le jour et l'heure. Paiement en ligne ou au salon."
        image={photoOf(photos, "contact")}
      />
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-28 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative min-h-[280px] overflow-hidden rounded-2xl">
          <CatalogImage src={photoOf(photos, "cut")} alt="Coupe au salon MAC NATION, Nord Foire" fill />
        </div>
        <BookingForm />
      </section>
    </main>
  );
}
