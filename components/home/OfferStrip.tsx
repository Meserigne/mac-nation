import CatalogImage from "@/components/CatalogImage";
import Link from "next/link";
import PaymentLogos from "@/components/PaymentLogos";
import Reveal from "@/components/Reveal";
import { people } from "@/lib/assets";

export default function OfferStrip({ boutique, waiting }: { boutique?: string; waiting?: string }) {
  return (
    <section className="w-full px-4 py-20 sm:px-8">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal>
          <Link href="/boutique" className="group relative block min-h-[320px] overflow-hidden rounded-2xl">
            <CatalogImage
              src={boutique || people.boutique}
              alt="Boutique capillaire MAC NATION"
              fill
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-8">
              <h2 className="font-bebas text-5xl text-white">Boutique capillaire</h2>
              <p className="mt-2 max-w-[40ch] text-sm text-gray-300">
                Payer par Wave, Max it ou Mixx. Retrait au salon Nord Foire.
              </p>
              <PaymentLogos size="sm" className="mt-3 justify-start" />
              <span className="btn-gold mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium">
                Payer un produit
              </span>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Link href="/abonnements" className="group relative block min-h-[320px] overflow-hidden rounded-2xl">
            <CatalogImage
              src={waiting || people.waiting}
              alt="Abonnements MAC NATION"
              fill
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-8">
              <h2 className="font-bebas text-5xl text-white">Abonnements</h2>
              <p className="mt-2 max-w-[42ch] text-sm text-gray-300">
                Payer l&apos;abonnement en ligne. Wave, Max it ou Mixx.
              </p>
              <PaymentLogos size="sm" className="mt-3 justify-start" />
              <span className="btn-gold mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium">
                Payer un abonnement
              </span>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
