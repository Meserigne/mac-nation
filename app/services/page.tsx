import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { services } from "@/lib/data";
import { pageImages } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Catalogue - Coupe, Barbe, Enfants, Soins",
};

export default function ServicesPage() {
  return (
    <main>
      <PageHero
        title="Catalogue - Coupe, Barbe, Enfants"
        subtitle="Prestations au salon de Nord Foire, ou à domicile. Hommes, ados et enfants. Tarifs en francs CFA."
        image={pageImages.services}
      />
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 px-6 pb-28 md:grid-cols-2">
        {services.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.05}>
            <article className="flex h-full overflow-hidden rounded-2xl bg-gray-950 stroke-gradient [--stroke-opacity:0.2]">
              <div className="relative hidden w-[42%] min-w-[140px] sm:block">
                <Image src={s.image} alt="" fill className="object-cover" sizes="280px" />
              </div>
              <div className="flex flex-1 flex-col justify-between p-7">
                <div>
                  {s.tag ? (
                    <p className="mb-2 text-xs font-medium tracking-wide text-[#c4a574]">{s.tag}</p>
                  ) : null}
                  <h2 className="font-bebas text-4xl text-white">{s.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{s.description}</p>
                </div>
                <div className="mt-8 flex items-end justify-between gap-3">
                  <span className="text-xs text-gray-500">{s.duration}</span>
                  <span className="font-bebas text-3xl text-white">{s.price}</span>
                </div>
                <Link
                  href="/rendez-vous"
                  className="btn-gold mt-4 inline-flex h-11 items-center justify-center rounded-lg text-sm font-medium"
                >
                  Réserver
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </section>
    </main>
  );
}
