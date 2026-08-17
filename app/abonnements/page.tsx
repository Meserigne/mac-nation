import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { plans } from "@/lib/data";
import { pageImages, people, photos } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Abonnements",
};

export default function AbonnementsPage() {
  return (
    <main>
      <PageHero
        title="Abonnements"
        subtitle="Un rythme, un prix, un salon. Valable uniquement à Nord Foire."
        image={pageImages.abonnements}
      />
      <section className="mx-auto mb-10 max-w-[1100px] px-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { src: people.waiting, alt: "Clients en attente" },
            { src: photos.lounge, alt: "Lounge" },
            { src: people.cut, alt: "Coupe en salon" },
          ].map((shot) => (
            <div key={shot.src} className="relative aspect-[16/10] overflow-hidden rounded-xl">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover" sizes="33vw" />
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 pb-12 md:grid-cols-3">
        {plans.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.06}>
            <article
              className={`flex h-full flex-col rounded-2xl p-7 stroke-gradient [--stroke-opacity:0.2] ${
                plan.highlight ? "bg-gray-900" : "bg-gray-950"
              }`}
            >
              {plan.highlight ? (
                <p className="mb-3 text-xs font-medium text-[#c4a574]">Le plus choisi</p>
              ) : (
                <div className="mb-3 h-4" />
              )}
              <h2 className="font-bebas text-4xl text-white">{plan.name}</h2>
              <p className="mt-4 font-bebas text-5xl text-white">{plan.price}</p>
              <p className="text-sm text-gray-500">{plan.period}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-gray-300">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link
                href="/contact"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-lg text-sm transition-all ${
                  plan.highlight
                    ? "btn-gold"
                    : "bg-gray-400/15 text-white hover:bg-gray-200/80 hover:text-gray-950"
                }`}
              >
                Souscrire
              </Link>
            </article>
          </Reveal>
        ))}
      </section>
      <p className="mx-auto max-w-[60ch] px-6 pb-24 text-center text-sm text-gray-500">
        Les abonnements se prennent au salon ou par message. Les visites non utilisées ne se reportent pas au mois
        suivant.
      </p>
    </main>
  );
}
