import CatalogImage from "@/components/CatalogImage";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import PlusChip from "@/components/PlusChip";
import { people, photos } from "@/lib/assets";

export default function BrandExperience({
  reception,
  team,
}: {
  reception?: string;
  team?: string;
}) {
  const receptionSrc = reception || photos.reception;
  const teamSrc = team || people.reception;
  return (
    <section className="relative w-full p-4 py-20 sm:p-8 lg:p-12">
      <div className="bb-container relative overflow-hidden rounded-2xl bg-background p-4 backdrop-blur-sm stroke-gradient [--stroke-opacity:0.2] sm:p-8 lg:p-14">
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <CatalogImage src={receptionSrc} alt="" fill className="opacity-25 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Reveal className="mb-10 flex flex-col items-center justify-center gap-y-5 text-center">
            <span className="rounded-[14px] border-[0.5px] border-gray-700 bg-transparent px-4 py-2 text-[1rem] font-medium text-white shadow-[0_0_10px_inset_rgba(100,100,100,0.1)]">
              Marque
            </span>
            <h2 className="title1 text-6xl">
              Plus qu&apos;une simple coupe...
              <br /> une nation
            </h2>
          </Reveal>
          <Reveal className="grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg stroke-gradient [--stroke-opacity:0.2]">
              <CatalogImage src={receptionSrc} alt="L'accueil MAC NATION" fill />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg stroke-gradient [--stroke-opacity:0.2]">
              <CatalogImage src={teamSrc} alt="L'équipe à l'accueil" fill />
            </div>
          </Reveal>
          <div className="mx-auto my-10 max-w-180">
            <p className="text-center text-md leading-relaxed font-medium text-gray-400">
              <span className="font-semibold text-gray-200">MAC NATION</span>, l&apos;art de lier la coiffure
              classique au barbering moderne, à Dakar. Une{" "}
              <span className="font-semibold text-gray-200">expérience unique</span> portée par un{" "}
              <span className="font-semibold text-gray-200">savoir-faire</span> et une exigence commune.
              <br />
              Notre promesse : la même qualité sur tous types de cheveux, en salon, en boutique et en abonnement.
            </p>
          </div>
          <Link href="/the-brand">
            <PlusChip label="En savoir plus sur nous" />
          </Link>
        </div>
      </div>
    </section>
  );
}
