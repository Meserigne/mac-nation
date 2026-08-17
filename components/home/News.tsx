import Image from "next/image";
import Link from "next/link";
import { articles } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function News() {
  const latest = articles.slice(0, 3);

  return (
    <section className="flex w-full items-center justify-center p-4 py-20 text-center sm:p-8 lg:p-[6vw]">
      <div className="bb-container w-full max-w-[1200px] pt-0 pb-20">
        <Reveal>
          <h2 className="mb-8 font-bebas text-5xl text-white">Dernières actualités</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-sm text-gray-400">
            Le journal MAC NATION : actus du salon, conseils grooming et coulisses à Dakar.
          </p>
        </Reveal>
        <Reveal delay={0.12} className="flex flex-col items-center py-8">
          <Link
            href="/blog"
            className="flex cursor-pointer items-center gap-x-2 rounded-lg bg-gray-800 px-5 py-1.5 text-[14px] text-gray-100 stroke-gradient transition-colors [--stroke-opacity:0.2] [--stroke-width:1px] hover:bg-gray-700"
          >
            Voir toutes les actualités
          </Link>
        </Reveal>
        <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-3 md:gap-4">
          {latest.map((article, i) => (
            <Reveal key={article.slug} delay={0.08 * i}>
              <Link href={`/blog/${article.slug}`} className="group block text-left">
                <div className="rounded-[15px] p-[1px] stroke-gradient [--stroke-opacity:.2]">
                  <div className="relative min-h-[150px] w-full overflow-hidden rounded-[14px] md:aspect-[7/5]">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <div className="text-sm font-medium text-gray-400">{article.category}</div>
                  <div className="mt-1 line-clamp-1 font-bebas text-[2rem] leading-[1.2] text-white uppercase">
                    {article.title}
                  </div>
                  <time dateTime={article.dateIso} className="text-xs font-light text-gray-400/80 capitalize">
                    {article.date}
                  </time>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
