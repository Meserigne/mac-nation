import { assets, pageImages, people, photos } from "@/lib/assets";

export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
};

export type SitePhotos = {
  slots: Record<string, string>;
  gallery: GalleryPhoto[];
};

export const PHOTO_SLOTS = [
  { id: "hero", label: "Accueil · photo principale", fallback: assets.hero },
  { id: "reception", label: "Accueil · réception", fallback: photos.reception },
  { id: "receptionTeam", label: "Accueil · équipe", fallback: people.reception },
  { id: "cut", label: "Coupe en chaise", fallback: people.cut },
  { id: "stations", label: "Postes de coupe", fallback: photos.stations },
  { id: "client", label: "Client au salon", fallback: people.client },
  { id: "waiting", label: "Salle d'attente", fallback: people.waiting },
  { id: "lounge", label: "Lounge", fallback: photos.lounge },
  { id: "barber", label: "Barber", fallback: people.barber },
  { id: "fullSalon", label: "Vue du salon", fallback: photos.fullSalon },
  { id: "salonBanner", label: "Page Le salon · bannière", fallback: photos.fullSalonAlt },
  { id: "salonMain", label: "Page Le salon · photo principale", fallback: photos.reception },
  { id: "boutique", label: "Boutique · bannière", fallback: pageImages.boutique },
  { id: "boutiqueDesk", label: "Boutique · vitrine", fallback: photos.boutiqueDesk },
  { id: "boutiquePeople", label: "Boutique · client", fallback: people.boutique },
  { id: "services", label: "Catalogue · bannière", fallback: pageImages.services },
  { id: "abonnements", label: "Abonnements · bannière", fallback: pageImages.abonnements },
  { id: "contact", label: "Contact · bannière", fallback: pageImages.contact },
  { id: "career", label: "Carrières · bannière", fallback: pageImages.career },
  { id: "blog", label: "Blog · bannière", fallback: pageImages.blog },
  { id: "brand", label: "La marque · bannière", fallback: pageImages.brand },
  { id: "reviews", label: "Avis · portrait", fallback: assets.reviewsCharacter },
] as const;

export type PhotoSlotId = (typeof PHOTO_SLOTS)[number]["id"];

export function defaultPhotos(): SitePhotos {
  return {
    slots: Object.fromEntries(PHOTO_SLOTS.map((item) => [item.id, item.fallback])),
    gallery: assets.gallery.map((src, index) => ({
      id: `gallery-${index + 1}`,
      src,
      alt: `MAC NATION Nord Foire ${index + 1}`,
    })),
  };
}

export function asPhotos(raw: Partial<SitePhotos> | undefined): SitePhotos {
  const seed = defaultPhotos();
  if (!raw) return seed;
  const slots = { ...seed.slots, ...(raw.slots || {}) };
  const gallery = Array.isArray(raw.gallery)
    ? raw.gallery
        .map((item, index) => ({
          id: item.id || `gallery-${index + 1}`,
          src: item.src || "",
          alt: item.alt || `MAC NATION ${index + 1}`,
        }))
        .filter((item) => item.src)
    : seed.gallery;
  return { slots, gallery };
}

export function photoOf(photos: SitePhotos | undefined, id: PhotoSlotId) {
  const slot = PHOTO_SLOTS.find((item) => item.id === id);
  const custom = photos?.slots?.[id];
  return custom || slot?.fallback || "";
}

export function galleryOf(photos: SitePhotos | undefined) {
  const gallery = photos?.gallery?.filter((item) => item.src) || [];
  return gallery.length ? gallery : defaultPhotos().gallery;
}
