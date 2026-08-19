import CatalogImage from "@/components/CatalogImage";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Reveal from "@/components/Reveal";
import { people } from "@/lib/assets";

const items = [
  { href: "/career", kicker: "En tant que barber", title: "Rejoindre l'équipe" },
  { href: "/rendez-vous", kicker: "En tant que client", title: "Prendre rendez-vous" },
  { href: "/abonnements", kicker: "En tant que membre", title: "Prendre un abonnement" },
];

export default function JoinCTA({ image }: { image?: string }) {
  return (
    <section className="relative w-full overflow-hidden px-4 py-20">
      <div className="pointer-events-none absolute inset-0">
        <CatalogImage src={image || people.waiting} alt="" fill className="opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" />
      </div>
      <div className="relative z-10">
        <Reveal>
          <h3 className="title1 mb-2 text-center text-4xl md:text-5xl">L&apos;histoire s&apos;écrit à Dakar</h3>
        </Reveal>
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:px-16 lg:py-14">
          {items.map((item, i) => (
            <Reveal key={item.href} delay={i * 0.08} className="w-full sm:w-auto">
              <div className="neon-card flex w-full flex-col items-center justify-center rounded-3xl p-2">
                <Link
                  href={item.href}
                  className="flex h-35 w-full items-center justify-between gap-y-4 rounded-2xl bg-gray-950 p-6 stroke-gradient transition-all duration-300 [--stroke-opacity:0.2] hover:bg-gray-700 sm:w-100 lg:h-30 lg:w-[25vw]"
                >
                  <div className="mr-1 flex flex-col justify-center gap-y-1 sm:mr-6">
                    <span className="line-clamp-2 text-md font-semibold text-gray-500">{item.kicker}</span>
                    <b className="line-clamp-2 text-xl font-bold">{item.title}</b>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-950/90">
                    <ArrowRight size={16} className="text-[#c4a574]" />
                  </span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
