import { people, salonInfo } from "@/lib/assets";
import { plans as seedPlans, products as seedProducts, services as seedServices } from "@/lib/data";

export type CategoryKind = "produit" | "prestation";

export type CatalogCategory = {
  id: string;
  name: string;
  kind: CategoryKind;
  sort: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  priceFcfa: number;
  categoryId: string;
  description: string;
  image: string;
  active: boolean;
  sort: number;
};

export type CatalogService = {
  id: string;
  name: string;
  duration: string;
  priceFcfa: number;
  priceLabel: string;
  categoryId: string;
  tag: string;
  description: string;
  image: string;
  active: boolean;
  sort: number;
};

export type CatalogPlan = {
  id: string;
  name: string;
  priceFcfa: number;
  period: string;
  highlight: boolean;
  points: string[];
  visits: number;
  boutiquePercent: number;
  active: boolean;
  sort: number;
};

export type SiteSettings = {
  name: string;
  address: string;
  city: string;
  country: string;
  hours: string;
  phone: string;
  email: string;
  tagline: string;
  domicileFee: number;
};

export type Catalog = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  services: CatalogService[];
  plans: CatalogPlan[];
  site: SiteSettings;
};

function digits(label: string) {
  const n = Number(String(label).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function defaultSite(): SiteSettings {
  return {
    name: salonInfo.name,
    address: salonInfo.address,
    city: salonInfo.city,
    country: salonInfo.country,
    hours: salonInfo.hours,
    phone: "",
    email: "",
    tagline: "Un lieu, une coupe, une nation.",
    domicileFee: 2000,
  };
}

export function defaultCatalog(): Catalog {
  const productTags = Array.from(new Set(seedProducts.map((item) => item.tag)));
  const categories: CatalogCategory[] = [
    ...productTags.map((name, index) => ({
      id: slug(name) || `cat-${index}`,
      name,
      kind: "produit" as const,
      sort: index,
    })),
    { id: "homme", name: "Homme", kind: "prestation", sort: 20 },
    { id: "enfants", name: "Enfants", kind: "prestation", sort: 21 },
    { id: "domicile", name: "Domicile", kind: "prestation", sort: 22 },
  ];

  const products: CatalogProduct[] = seedProducts.map((item, index) => ({
    id: item.id,
    name: item.name,
    priceFcfa: digits(item.price),
    categoryId: slug(item.tag),
    description: item.description,
    image: item.image,
    active: true,
    sort: index,
  }));

  const services: CatalogService[] = seedServices.map((item, index) => {
    const tag = "tag" in item && typeof item.tag === "string" ? item.tag : "";
    const categoryId = tag === "Enfants" ? "enfants" : tag === "Domicile" ? "domicile" : "homme";
    const priceFcfa = digits(item.price);
    return {
      id: item.id,
      name: item.name,
      duration: item.duration,
      priceFcfa,
      priceLabel: priceFcfa > 0 && item.price.includes("000") && !item.price.startsWith("à") ? "" : item.price,
      categoryId,
      tag,
      description: item.description,
      image: item.image,
      active: true,
      sort: index,
    };
  });

  const plans: CatalogPlan[] = seedPlans.map((item, index) => ({
    id: item.id,
    name: item.name,
    priceFcfa: digits(item.price),
    period: item.period,
    highlight: item.highlight,
    points: item.points.slice(),
    visits: item.visits,
    boutiquePercent: item.boutiquePercent,
    active: true,
    sort: index,
  }));

  return { categories, products, services, plans, site: defaultSite() };
}

export function catalogPriceLabel(priceFcfa: number, priceLabel?: string) {
  const custom = (priceLabel || "").trim();
  if (custom) return custom;
  if (priceFcfa <= 0) return "Sur devis";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(priceFcfa))} F`;
}

export function asCategory(raw: Partial<CatalogCategory>, index = 0): CatalogCategory {
  const kind: CategoryKind = raw.kind === "prestation" ? "prestation" : "produit";
  return {
    id: raw.id || slug(raw.name || "") || crypto.randomUUID(),
    name: raw.name || "Catégorie",
    kind,
    sort: Number(raw.sort) || index,
  };
}

export function asProduct(raw: Partial<CatalogProduct>, index = 0): CatalogProduct {
  return {
    id: raw.id || slug(raw.name || "") || crypto.randomUUID(),
    name: raw.name || "Produit",
    priceFcfa: Math.max(0, Number(raw.priceFcfa) || 0),
    categoryId: raw.categoryId || "",
    description: raw.description || "",
    image: raw.image || people.boutique,
    active: raw.active !== false,
    sort: Number(raw.sort) || index,
  };
}

export function asService(raw: Partial<CatalogService>, index = 0): CatalogService {
  return {
    id: raw.id || slug(raw.name || "") || crypto.randomUUID(),
    name: raw.name || "Prestation",
    duration: raw.duration || "",
    priceFcfa: Math.max(0, Number(raw.priceFcfa) || 0),
    priceLabel: raw.priceLabel || "",
    categoryId: raw.categoryId || "homme",
    tag: raw.tag || "",
    description: raw.description || "",
    image: raw.image || people.cut,
    active: raw.active !== false,
    sort: Number(raw.sort) || index,
  };
}

export function asPlan(raw: Partial<CatalogPlan>, index = 0): CatalogPlan {
  const points = Array.isArray(raw.points) ? raw.points.map((item) => String(item).trim()).filter(Boolean) : [];
  return {
    id: raw.id || slug(raw.name || "") || crypto.randomUUID(),
    name: raw.name || "Abonnement",
    priceFcfa: Math.max(0, Number(raw.priceFcfa) || 0),
    period: raw.period || "par mois",
    highlight: Boolean(raw.highlight),
    points,
    visits: Math.max(1, Number(raw.visits) || 2),
    boutiquePercent: Math.max(0, Number(raw.boutiquePercent) || 0),
    active: raw.active !== false,
    sort: Number(raw.sort) || index,
  };
}

export function asSite(raw: Partial<SiteSettings> | undefined): SiteSettings {
  const base = defaultSite();
  if (!raw) return base;
  return {
    name: raw.name || base.name,
    address: raw.address || base.address,
    city: raw.city || base.city,
    country: raw.country || base.country,
    hours: raw.hours || base.hours,
    phone: raw.phone || "",
    email: raw.email || "",
    tagline: raw.tagline || base.tagline,
    domicileFee: Math.max(0, Number(raw.domicileFee) || base.domicileFee),
  };
}

export function asCatalog(raw: Partial<Catalog> | undefined): Catalog {
  const seed = defaultCatalog();
  if (!raw || (!raw.products && !raw.services && !raw.plans && !raw.categories && !raw.site)) return seed;
  return {
    categories: Array.isArray(raw.categories) ? raw.categories.map((item, i) => asCategory(item, i)) : seed.categories,
    products: Array.isArray(raw.products) ? raw.products.map((item, i) => asProduct(item, i)) : seed.products,
    services: Array.isArray(raw.services) ? raw.services.map((item, i) => asService(item, i)) : seed.services,
    plans: Array.isArray(raw.plans) ? raw.plans.map((item, i) => asPlan(item, i)) : seed.plans,
    site: asSite(raw.site),
  };
}

export function publicCatalog(catalog: Catalog): Catalog {
  const sortFn = <T extends { sort: number; name: string }>(a: T, b: T) => a.sort - b.sort || a.name.localeCompare(b.name, "fr");
  return {
    categories: catalog.categories.slice().sort(sortFn),
    products: catalog.products.filter((item) => item.active).slice().sort(sortFn),
    services: catalog.services.filter((item) => item.active).slice().sort(sortFn),
    plans: catalog.plans.filter((item) => item.active).slice().sort(sortFn),
    site: catalog.site,
  };
}

export function newId(name: string) {
  return `${slug(name) || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}
