"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  asCatalog,
  catalogPriceLabel,
  newId,
  type Catalog,
  type CatalogCategory,
  type CatalogPlan,
  type CatalogProduct,
  type CatalogService,
  type CategoryKind,
} from "@/lib/catalog";

const TABS = [
  { id: "prestations", label: "Prestations" },
  { id: "produits", label: "Produits" },
  { id: "categories", label: "Catégories" },
  { id: "abonnements", label: "Abonnements" },
] as const;

const field = "h-11 w-full rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50";
const area = "min-h-24 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50";

export default function CatalogManager() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("prestations");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as Catalog & { error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setCatalog(asCatalog(json));
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: Catalog) {
    setBusy("save");
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = (await res.json()) as { catalog?: Catalog; error?: string };
      if (!res.ok || !json.catalog) {
        setError(json.error || "Enregistrement impossible.");
        return;
      }
      setCatalog(asCatalog(json.catalog));
      setSaved("Enregistré.");
    } finally {
      setBusy("");
    }
  }

  async function upload(file: File) {
    const data = new FormData();
    data.set("file", file);
    const res = await fetch("/api/admin/catalog/upload", { method: "POST", body: data });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error || "Image refusée.");
    return json.url;
  }

  if (!catalog) {
    return <p className="mt-10 text-sm text-gray-500">{error || "Chargement du catalogue…"}</p>;
  }

  const productCats = catalog.categories.filter((item) => item.kind === "produit");
  const serviceCats = catalog.categories.filter((item) => item.kind === "prestation");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
          <h1 className="font-bebas mt-2 text-5xl text-white">Catalogue</h1>
          <p className="mt-2 text-sm text-gray-400">Prestations, produits, catégories, prix et abonnements.</p>
        </div>
        <button
          type="button"
          disabled={busy === "save"}
          onClick={() => void save(catalog)}
          className="btn-gold h-11 cursor-pointer rounded-lg px-5 text-sm font-medium disabled:opacity-70"
        >
          {busy === "save" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-[#c4a574]">{saved}</p> : null}

      <div className="mt-8 flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${
              tab === item.id ? "bg-[#c4a574] text-black" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "prestations" ? (
        <section className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() =>
              setCatalog({
                ...catalog,
                services: [
                  ...catalog.services,
                  {
                    id: newId("prestation"),
                    name: "Nouvelle prestation",
                    duration: "30 min",
                    priceFcfa: 5000,
                    priceLabel: "",
                    categoryId: serviceCats[0]?.id || "homme",
                    tag: "",
                    description: "",
                    image: "",
                    active: true,
                    sort: catalog.services.length,
                  },
                ],
              })
            }
            className="h-10 cursor-pointer rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10"
          >
            + Prestation
          </button>
          {catalog.services.map((item) => (
            <ServiceCard
              key={item.id}
              item={item}
              categories={serviceCats}
              onChange={(next) =>
                setCatalog({ ...catalog, services: catalog.services.map((row) => (row.id === item.id ? next : row)) })
              }
              onRemove={() => setCatalog({ ...catalog, services: catalog.services.filter((row) => row.id !== item.id) })}
              onUpload={upload}
            />
          ))}
        </section>
      ) : null}

      {tab === "produits" ? (
        <section className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() =>
              setCatalog({
                ...catalog,
                products: [
                  ...catalog.products,
                  {
                    id: newId("produit"),
                    name: "Nouveau produit",
                    priceFcfa: 5000,
                    categoryId: productCats[0]?.id || "",
                    description: "",
                    image: "",
                    active: true,
                    sort: catalog.products.length,
                  },
                ],
              })
            }
            className="h-10 cursor-pointer rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10"
          >
            + Produit
          </button>
          {catalog.products.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              categories={productCats}
              onChange={(next) =>
                setCatalog({ ...catalog, products: catalog.products.map((row) => (row.id === item.id ? next : row)) })
              }
              onRemove={() => setCatalog({ ...catalog, products: catalog.products.filter((row) => row.id !== item.id) })}
              onUpload={upload}
            />
          ))}
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() =>
              setCatalog({
                ...catalog,
                categories: [
                  ...catalog.categories,
                  { id: newId("categorie"), name: "Nouvelle catégorie", kind: "produit", sort: catalog.categories.length },
                ],
              })
            }
            className="h-10 cursor-pointer rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10"
          >
            + Catégorie
          </button>
          <ul className="space-y-3">
            {catalog.categories.map((item) => (
              <li key={item.id} className="grid gap-3 rounded-2xl bg-gray-950 p-4 ring-1 ring-white/10 sm:grid-cols-[1fr_160px_88px_auto]">
                <input className={field} value={item.name} onChange={(e) => patchCat(catalog, setCatalog, item.id, { name: e.target.value })} />
                <select
                  className={field}
                  value={item.kind}
                  onChange={(e) => patchCat(catalog, setCatalog, item.id, { kind: e.target.value as CategoryKind })}
                >
                  <option value="produit">Produit</option>
                  <option value="prestation">Prestation</option>
                </select>
                <input
                  className={field}
                  type="number"
                  value={item.sort}
                  onChange={(e) => patchCat(catalog, setCatalog, item.id, { sort: Number(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  onClick={() => setCatalog({ ...catalog, categories: catalog.categories.filter((row) => row.id !== item.id) })}
                  className="cursor-pointer text-sm text-gray-500 hover:text-red-300"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "abonnements" ? (
        <section className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() =>
              setCatalog({
                ...catalog,
                plans: [
                  ...catalog.plans,
                  {
                    id: newId("abo"),
                    name: "Nouvel abonnement",
                    priceFcfa: 15000,
                    period: "par mois",
                    highlight: false,
                    points: ["2 visites"],
                    visits: 2,
                    boutiquePercent: 10,
                    active: true,
                    sort: catalog.plans.length,
                  },
                ],
              })
            }
            className="h-10 cursor-pointer rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10"
          >
            + Abonnement
          </button>
          {catalog.plans.map((item) => (
            <PlanCard
              key={item.id}
              item={item}
              onChange={(next) => setCatalog({ ...catalog, plans: catalog.plans.map((row) => (row.id === item.id ? next : row)) })}
              onRemove={() => setCatalog({ ...catalog, plans: catalog.plans.filter((row) => row.id !== item.id) })}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function patchCat(
  catalog: Catalog,
  setCatalog: (next: Catalog) => void,
  id: string,
  patch: Partial<CatalogCategory>,
) {
  setCatalog({
    ...catalog,
    categories: catalog.categories.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  });
}

function ServiceCard({
  item,
  categories,
  onChange,
  onRemove,
  onUpload,
}: {
  item: CatalogService;
  categories: CatalogCategory[];
  onChange: (item: CatalogService) => void;
  onRemove: () => void;
  onUpload: (file: File) => Promise<string>;
}) {
  return (
    <article className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-gray-500">
          Nom
          <input className={`${field} mt-1`} value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Durée
          <input className={`${field} mt-1`} value={item.duration} onChange={(e) => onChange({ ...item, duration: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Prix (F)
          <input
            className={`${field} mt-1`}
            type="number"
            value={item.priceFcfa}
            onChange={(e) => onChange({ ...item, priceFcfa: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="text-xs text-gray-500">
          Libellé prix (optionnel)
          <input
            className={`${field} mt-1`}
            value={item.priceLabel}
            placeholder={catalogPriceLabel(item.priceFcfa, "")}
            onChange={(e) => onChange({ ...item, priceLabel: e.target.value })}
          />
        </label>
        <label className="text-xs text-gray-500">
          Catégorie
          <select className={`${field} mt-1`} value={item.categoryId} onChange={(e) => onChange({ ...item, categoryId: e.target.value })}>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Tag
          <input className={`${field} mt-1`} value={item.tag} onChange={(e) => onChange({ ...item, tag: e.target.value })} />
        </label>
        <label className="flex items-end gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={item.active} onChange={(e) => onChange({ ...item, active: e.target.checked })} />
          Visible sur le site
        </label>
        <label className="text-xs text-gray-500">
          Photo
          <input
            className={`${field} mt-1`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                onChange({ ...item, image: await onUpload(file) });
              } catch {
                /* parent shows save errors */
              }
            }}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-gray-500">
        Description
        <textarea className={`${area} mt-1`} value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} />
      </label>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{catalogPriceLabel(item.priceFcfa, item.priceLabel)}</span>
        <button type="button" onClick={onRemove} className="cursor-pointer hover:text-red-300">
          Retirer
        </button>
      </div>
    </article>
  );
}

function ProductCard({
  item,
  categories,
  onChange,
  onRemove,
  onUpload,
}: {
  item: CatalogProduct;
  categories: CatalogCategory[];
  onChange: (item: CatalogProduct) => void;
  onRemove: () => void;
  onUpload: (file: File) => Promise<string>;
}) {
  return (
    <article className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-gray-500">
          Nom
          <input className={`${field} mt-1`} value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Prix (F)
          <input
            className={`${field} mt-1`}
            type="number"
            value={item.priceFcfa}
            onChange={(e) => onChange({ ...item, priceFcfa: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="text-xs text-gray-500">
          Catégorie
          <select className={`${field} mt-1`} value={item.categoryId} onChange={(e) => onChange({ ...item, categoryId: e.target.value })}>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={item.active} onChange={(e) => onChange({ ...item, active: e.target.checked })} />
          Visible sur le site
        </label>
        <label className="text-xs text-gray-500 sm:col-span-2">
          Image (fichier ou URL)
          <input className={`${field} mt-1`} value={item.image} onChange={(e) => onChange({ ...item, image: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Téléverser
          <input
            className={`${field} mt-1`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onChange({ ...item, image: await onUpload(file) });
            }}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-gray-500">
        Description
        <textarea className={`${area} mt-1`} value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} />
      </label>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onRemove} className="cursor-pointer text-xs text-gray-500 hover:text-red-300">
          Retirer
        </button>
      </div>
    </article>
  );
}

function PlanCard({
  item,
  onChange,
  onRemove,
}: {
  item: CatalogPlan;
  onChange: (item: CatalogPlan) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-gray-500">
          Nom
          <input className={`${field} mt-1`} value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Prix (F)
          <input
            className={`${field} mt-1`}
            type="number"
            value={item.priceFcfa}
            onChange={(e) => onChange({ ...item, priceFcfa: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="text-xs text-gray-500">
          Période
          <input className={`${field} mt-1`} value={item.period} onChange={(e) => onChange({ ...item, period: e.target.value })} />
        </label>
        <label className="text-xs text-gray-500">
          Visites / mois
          <input
            className={`${field} mt-1`}
            type="number"
            value={item.visits}
            onChange={(e) => onChange({ ...item, visits: Number(e.target.value) || 1 })}
          />
        </label>
        <label className="text-xs text-gray-500">
          Remise boutique %
          <input
            className={`${field} mt-1`}
            type="number"
            value={item.boutiquePercent}
            onChange={(e) => onChange({ ...item, boutiquePercent: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-end gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={item.highlight} onChange={(e) => onChange({ ...item, highlight: e.target.checked })} />
          Mis en avant
        </label>
        <label className="flex items-end gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={item.active} onChange={(e) => onChange({ ...item, active: e.target.checked })} />
          Visible
        </label>
      </div>
      <label className="mt-3 block text-xs text-gray-500">
        Avantages (une ligne chacun)
        <textarea
          className={`${area} mt-1`}
          value={item.points.join("\n")}
          onChange={(e) => onChange({ ...item, points: e.target.value.split("\n") })}
        />
      </label>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onRemove} className="cursor-pointer text-xs text-gray-500 hover:text-red-300">
          Retirer
        </button>
      </div>
    </article>
  );
}
