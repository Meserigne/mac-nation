import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import CatalogImage from "@/components/CatalogImage";
import Reveal from "@/components/Reveal";
import PaymentLogos from "@/components/PaymentLogos";
import { catalogPriceLabel } from "@/lib/catalog";
import { photoOf } from "@/lib/site-photos";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "Abonnements",
};

export const dynamic = "force-dynamic";

export default async function AbonnementsPage() {
  const catalog = await getPublicCatalog();
  const plans = catalog.plans;
  const photos = catalog.photos;
  return (
    <main>
      <PageHero
        payments
        title="Abonnements"
        subtitle="Payer en ligne par Wave, Max it ou Mixx. Valable uniquement à Nord Foire."
        image={photoOf(photos, "abonnements")}
      />
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
              <p className="mt-4 font-bebas text-5xl text-white">{catalogPriceLabel(plan.priceFcfa)}</p>
              <p className="text-sm text-gray-500">{plan.period}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-gray-300">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link
                href={`/abonnements/payer/${plan.id}`}
                className="btn-gold mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-lg text-sm font-medium"
              >
                Payer
                <PaymentLogos size="sm" />
              </Link>
            </article>
          </Reveal>
        ))}
      </section>
      <section className="mx-auto mb-10 max-w-[1100px] px-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { src: photoOf(photos, "waiting"), alt: "Clients en attente" },
            { src: photoOf(photos, "lounge"), alt: "Lounge" },
            { src: photoOf(photos, "cut"), alt: "Coupe en salon" },
          ].map((shot) => (
            <div key={shot.alt} className="relative aspect-[16/10] overflow-hidden rounded-xl">
              <CatalogImage src={shot.src} alt={shot.alt} fill />
            </div>
          ))}
        </div>
      </section>
      <p className="mx-auto max-w-[60ch] px-6 pb-24 text-center text-sm text-gray-500">
        L&apos;abonnement démarre dès le paiement. Les visites non utilisées ne se reportent pas au mois suivant.
      </p>
    </main>
  );
}
