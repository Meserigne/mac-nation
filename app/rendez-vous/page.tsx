import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import BookingForm from "@/components/BookingForm";
import { pageImages, people } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Prendre rendez-vous",
};

export default function RendezVousPage() {
  return (
    <main>
      <PageHero
        title="Prendre rendez-vous"
        subtitle="Choisissez le jour, l'heure et le lieu. Vous pouvez payer maintenant par Wave, Orange Money ou Free."
        image={pageImages.contact}
      />
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-28 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative min-h-[280px] overflow-hidden rounded-2xl">
          <Image
            src={people.cut}
            alt="Coupe au salon MAC NATION, Nord Foire"
            fill
            className="object-cover"
            sizes="50vw"
          />
        </div>
        <BookingForm />
      </section>
    </main>
  );
}
