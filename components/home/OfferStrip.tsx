import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { people } from "@/lib/assets";

export default function OfferStrip() {
  return (
    <section className="w-full px-4 py-20 sm:px-8">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal>
          <Link href="/boutique" className="group relative block min-h-[320px] overflow-hidden rounded-2xl">
            <Image
              src={people.boutique}
              alt="Boutique capillaire MAC NATION"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-8">
              <h2 className="font-bebas text-5xl text-white">Boutique capillaire</h2>
              <p className="mt-2 max-w-[40ch] text-sm text-gray-300">
                Les produits de la vitrine, les mêmes qu&apos;on utilise en chaise, à emporter.
              </p>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Link href="/abonnements" className="group relative block min-h-[320px] overflow-hidden rounded-2xl">
            <Image
              src={people.waiting}
              alt="Abonnements MAC NATION"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-8">
              <h2 className="font-bebas text-5xl text-white">Abonnements</h2>
              <p className="mt-2 max-w-[42ch] text-sm text-gray-300">
                Deux ou quatre visites par mois. Un rythme, un prix, un salon qui vous connaît.
              </p>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
