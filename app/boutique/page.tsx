import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { products } from "@/lib/data";
import { pageImages, people, photos } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Boutique capillaire",
};

export default function BoutiquePage() {
  return (
    <main>
      <PageHero
        title="Boutique capillaire"
        subtitle="Les produits qu'on utilise en chaise, à emporter. Nord Foire, Dakar."
        image={pageImages.boutique}
      />
      <section className="mx-auto max-w-[1100px] px-6 pb-12">
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
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 pb-28 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.05}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-gray-950 stroke-gradient [--stroke-opacity:0.2]">
              <div className="relative aspect-square bg-black">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="360px" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs text-gray-500">{p.tag}</p>
                <h2 className="mt-1 font-bebas text-3xl text-white">{p.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">{p.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="font-bebas text-2xl text-white">{p.price}</span>
                  <Link
                    href="/contact"
                    className="btn-gold rounded-lg px-4 py-2 text-sm transition-all"
                  >
                    Commander
                  </Link>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </section>
    </main>
  );
}
