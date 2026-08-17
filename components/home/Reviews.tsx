"use client";

import Image from "next/image";
import { assets } from "@/lib/assets";
import { reviews } from "@/lib/data";
import Reveal from "@/components/Reveal";

function Card({ name, text }: { name: string; text: string }) {
  return (
    <article className="flex w-[min(86vw,320px)] shrink-0 flex-col justify-between rounded-xl bg-gray-950 p-6 stroke-gradient [--stroke-opacity:0.18] md:w-[340px]">
      <p className="text-sm leading-relaxed text-gray-300">{text}</p>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="mt-0.5 text-xs text-gray-500">Nord Foire, Dakar</p>
        </div>
        <p className="shrink-0 text-xs tracking-wide text-[#c4a574]">5/5</p>
      </div>
    </article>
  );
}

export default function Reviews() {
  const loop = [...reviews, ...reviews];
  const featured = reviews[0];

  return (
    <section className="w-full py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <Reveal>
          <header className="mx-auto max-w-[36rem] text-center">
            <h2 className="title1 text-4xl sm:text-5xl md:text-6xl">Une expérience saluée par nos clients</h2>
            <p className="mt-4 text-sm text-gray-400 md:text-base">
              Les premiers retours, à <span className="text-gray-200">Nord Foire</span>
            </p>
          </header>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:mt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <Reveal>
            <div className="relative mx-auto aspect-[3/4] max-h-[520px] w-full max-w-[420px] overflow-hidden rounded-2xl lg:mx-0 lg:max-h-none">
              <Image
                src={assets.reviewsCharacter}
                alt="Client MAC NATION au salon de Nord Foire"
                fill
                sizes="(max-width:1024px) 90vw, 420px"
                className="object-cover object-top"
              />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div>
              <p className="font-bebas text-6xl leading-none tracking-wide text-white md:text-7xl">Dakar</p>
              <p className="mt-2 text-sm tracking-[0.18em] text-[#c4a574] uppercase">Nord Foire · 5/5</p>
              <blockquote className="mt-8 max-w-[42ch] text-lg leading-relaxed text-gray-300">
                « {featured.text} »
              </blockquote>
              <p className="mt-4 text-sm font-medium text-white">{featured.name}</p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="relative mt-14 overflow-hidden md:mt-20">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-24" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-24" />
        <div className="marquee-track flex w-max gap-4 px-4">
          {loop.map((r, i) => (
            <Card key={`${r.name}-${i}`} name={r.name} text={r.text} />
          ))}
        </div>
      </div>
    </section>
  );
}
