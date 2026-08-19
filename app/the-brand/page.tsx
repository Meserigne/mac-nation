import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CatalogImage from "@/components/CatalogImage";
import Reveal from "@/components/Reveal";
import JoinCTA from "@/components/home/JoinCTA";
import { timeline } from "@/lib/data";
import { photoOf } from "@/lib/site-photos";
import { getPublicCatalog } from "@/lib/store";

export const metadata: Metadata = {
  title: "La marque MAC NATION - Grooming à Dakar",
};

export const dynamic = "force-dynamic";

const values = [
  {
    title: "Marbre et or",
    body: "Le lieu dicte le geste. Marbre noir, moulures blanches, touches d'or : un salon pensé pour durer, lisible de Nord Foire jusqu'au reste de Dakar.",
  },
  {
    title: "Un savoir-faire",
    body: "Accueil, diagnostic, geste. Un parcours client clair, du premier regard jusqu'au produit emporté.",
  },
  {
    title: "Un savoir-être",
    body: "Chacun se sent à sa place. L'équipe incarne la diversité dakaroise et ouvre le salon à toutes les textures.",
  },
];

export default async function BrandPage() {
  const catalog = await getPublicCatalog();
  const photos = catalog.photos;
  const mosaic = [
    { src: photoOf(photos, "receptionTeam"), alt: "Accueil MAC NATION" },
    { src: photoOf(photos, "stations"), alt: "Postes de coupe" },
    { src: photoOf(photos, "waiting"), alt: "Clients en attente" },
    { src: photoOf(photos, "boutiqueDesk"), alt: "Boutique et accueil" },
  ];

  return (
    <main>
      <PageHero
        kicker="MAC NATION born and raised in Dakar"
        title="Une vision dakaroise du grooming moderne."
        subtitle="Plus qu'une coupe, une nation. Un salon, une boutique, des abonnements. Tout au même endroit."
        image={photoOf(photos, "brand")}
      />

      <section className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 px-6 pb-10 md:grid-cols-4">
        {mosaic.map((shot, i) => (
          <Reveal key={shot.alt} delay={i * 0.05}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
              <CatalogImage src={shot.src} alt={shot.alt} fill />
            </div>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-16 md:grid-cols-3">
        {values.map((v, i) => (
          <Reveal key={v.title} delay={i * 0.08} className="rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]">
            <h2 className="font-bebas text-3xl text-white">{v.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">{v.body}</p>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto max-w-[800px] px-6 py-10 text-center">
        <Reveal>
          <h2 className="title1 text-5xl">Des valeurs</h2>
          <p className="mt-6 text-sm leading-relaxed text-gray-400">
            MAC NATION est plus qu&apos;un salon : c&apos;est une vision. La diversité forge le geste. Chaque
            culture, chaque génération contribue. Un espace où l&apos;effort est valorisé, à Dakar.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 py-16 md:grid-cols-2">
        <Reveal className="relative min-h-[280px] overflow-hidden rounded-2xl">
          <CatalogImage src={photoOf(photos, "cut")} alt="Le salon de Nord Foire" fill />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-8">
            <h2 className="font-bebas text-4xl text-white">Un lieu unique</h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-gray-200">
              Pour le moment, un seul salon : Nord Foire, en face du service d&apos;hygiène. Toute l&apos;attention
              sur une adresse, une équipe, un standard.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08} className="relative min-h-[280px] overflow-hidden rounded-2xl">
          <CatalogImage src={photoOf(photos, "boutiquePeople")} alt="Boutique capillaire" fill />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-8">
            <h2 className="font-bebas text-4xl text-white">Salon, boutique, abonnement</h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-gray-200">
              La chaise, les produits, le rythme mensuel. On ne sépare pas la coupe de l&apos;entretien. C&apos;est
              le même univers, du rendez-vous jusqu&apos;au kit emporté.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[900px] px-6 py-16">
        <Reveal>
          <h2 className="title1 mb-10 text-center text-5xl">Notre histoire</h2>
        </Reveal>
        <ol className="relative space-y-10 border-l border-[#c4a574]/30 pl-8">
          {timeline.map((item, i) => (
            <Reveal key={item.year} delay={i * 0.05}>
              <li>
                <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-[#c4a574]" />
                <p className="font-bebas text-2xl text-white">{item.year}</p>
                <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-gray-400">{item.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <JoinCTA image={photoOf(photos, "waiting")} />
    </main>
  );
}
