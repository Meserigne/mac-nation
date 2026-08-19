"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import CatalogImage from "@/components/CatalogImage";
import { catalogPriceLabel, type CatalogCategory, type CatalogProduct } from "@/lib/catalog";

export default function BoutiqueGrid({
  products,
  categories,
}: {
  products: CatalogProduct[];
  categories: CatalogCategory[];
}) {
  const [cat, setCat] = useState("tous");
  const visible = useMemo(
    () => (cat === "tous" ? products : products.filter((item) => item.categoryId === cat)),
    [cat, products],
  );
  const cats = categories.filter((item) => item.kind === "produit");

  return (
    <>
      {cats.length > 1 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat("tous")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${
              cat === "tous" ? "btn-gold font-medium" : "bg-gray-900 text-gray-300 ring-1 ring-white/10"
            }`}
          >
            Tous
          </button>
          {cats.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCat(item.id)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${
                cat === item.id ? "btn-gold font-medium" : "bg-gray-900 text-gray-300 ring-1 ring-white/10"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.05}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-gray-950 stroke-gradient [--stroke-opacity:0.2]">
              <div className="relative aspect-square bg-black">
                <CatalogImage src={p.image} alt={p.name} className="absolute inset-0" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs text-gray-500">{cats.find((item) => item.id === p.categoryId)?.name || ""}</p>
                <h2 className="mt-1 font-bebas text-3xl text-white">{p.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">{p.description}</p>
                <p className="font-bebas mt-6 text-3xl text-white">{catalogPriceLabel(p.priceFcfa)}</p>
                <Link
                  href={`/boutique/payer/${p.id}`}
                  className="btn-gold mt-4 flex h-12 items-center justify-center rounded-lg text-sm font-medium"
                >
                  Payer par Wave / Orange / Free
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
