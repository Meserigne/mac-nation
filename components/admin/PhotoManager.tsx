"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { asCatalog, type Catalog } from "@/lib/catalog";
import CatalogImage from "@/components/CatalogImage";
import {
  PHOTO_SLOTS,
  asPhotos,
  defaultPhotos,
  type GalleryPhoto,
  type SitePhotos,
} from "@/lib/site-photos";

export default function PhotoManager() {
  const router = useRouter();
  const [photos, setPhotos] = useState<SitePhotos | null>(null);
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
    setPhotos(asPhotos(asCatalog(json).photos));
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: SitePhotos) {
    setBusy("save");
    setError("");
    setSaved("");
    try {
      const currentRes = await fetch("/api/admin/catalog", { cache: "no-store" });
      if (!currentRes.ok) {
        setError("Chargement impossible.");
        return;
      }
      const current = (await currentRes.json()) as Catalog;
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, photos: next }),
      });
      const json = (await res.json()) as { catalog?: Catalog; error?: string };
      if (!res.ok || !json.catalog) {
        setError(json.error || "Enregistrement impossible.");
        return;
      }
      setPhotos(asPhotos(json.catalog.photos));
      setSaved("Photos enregistrées.");
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

  async function replaceSlot(id: string, file: File) {
    if (!photos) return;
    setBusy(id);
    setError("");
    try {
      const url = await upload(file);
      const next = { ...photos, slots: { ...photos.slots, [id]: url } };
      setPhotos(next);
      await persist(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléversement impossible.");
    } finally {
      setBusy("");
    }
  }

  async function resetSlot(id: string) {
    if (!photos) return;
    const fallback = PHOTO_SLOTS.find((item) => item.id === id)?.fallback || "";
    const next = { ...photos, slots: { ...photos.slots, [id]: fallback } };
    setPhotos(next);
    await persist(next);
  }

  async function addGallery(file: File) {
    if (!photos) return;
    setBusy("gallery");
    setError("");
    try {
      const url = await upload(file);
      const item: GalleryPhoto = {
        id: crypto.randomUUID(),
        src: url,
        alt: `MAC NATION ${photos.gallery.length + 1}`,
      };
      const next = { ...photos, gallery: [...photos.gallery, item] };
      setPhotos(next);
      await persist(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléversement impossible.");
    } finally {
      setBusy("");
    }
  }

  async function patchGallery(id: string, patch: Partial<GalleryPhoto>) {
    if (!photos) return;
    const next = {
      ...photos,
      gallery: photos.gallery.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    };
    setPhotos(next);
    await persist(next);
  }

  async function moveGallery(index: number, dir: -1 | 1) {
    if (!photos) return;
    const target = index + dir;
    if (target < 0 || target >= photos.gallery.length) return;
    const gallery = photos.gallery.slice();
    const [item] = gallery.splice(index, 1);
    gallery.splice(target, 0, item);
    const next = { ...photos, gallery };
    setPhotos(next);
    await persist(next);
  }

  async function removeGallery(id: string) {
    if (!photos) return;
    const next = { ...photos, gallery: photos.gallery.filter((item) => item.id !== id) };
    setPhotos(next);
    await persist(next);
  }

  async function resetAll() {
    if (!confirm("Remettre toutes les photos du site sur les images d'origine ?")) return;
    await persist(defaultPhotos());
  }

  if (!photos) {
    return <p className="mt-10 text-sm text-gray-500">{error || "Chargement des photos…"}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
          <h1 className="font-bebas mt-2 text-5xl text-white">Photos</h1>
          <p className="mt-2 max-w-[62ch] text-sm text-gray-400">
            Remplace les photos du site : accueil, bannières, salon et galerie. JPG, PNG ou WebP, jusqu&apos;à 4 Mo.
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void resetAll()}
          className="h-11 cursor-pointer rounded-lg px-4 text-sm text-gray-400 ring-1 ring-white/10 hover:text-white disabled:opacity-50"
        >
          Remettre l&apos;origine
        </button>
      </div>
      {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-[#c4a574]">{saved}</p> : null}

      <h2 className="mt-10 font-bebas text-3xl text-white">Emplacements</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PHOTO_SLOTS.map((slot) => {
          const src = photos.slots[slot.id] || slot.fallback;
          const custom = src !== slot.fallback;
          return (
            <article key={slot.id} className="overflow-hidden rounded-2xl bg-gray-950 ring-1 ring-white/10">
              <div className="relative aspect-[16/10]">
                <CatalogImage src={src} alt={slot.label} fill />
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-white">{slot.label}</p>
                <p className="mt-1 text-xs text-gray-500">{custom ? "Photo personnalisée" : "Photo d'origine"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="btn-gold inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-xs font-medium">
                    {busy === slot.id ? "Envoi…" : "Remplacer"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={Boolean(busy)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void replaceSlot(slot.id, file);
                      }}
                    />
                  </label>
                  {custom ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void resetSlot(slot.id)}
                      className="h-9 cursor-pointer rounded-lg px-3 text-xs text-gray-400 ring-1 ring-white/10 hover:text-white disabled:opacity-50"
                    >
                      Origine
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <h2 className="mt-12 font-bebas text-3xl text-white">Galerie du salon</h2>
      <p className="mt-2 text-sm text-gray-400">Ces photos s&apos;affichent sur la page Le salon.</p>
      <div className="mt-4 space-y-3">
        {photos.gallery.map((item, index) => (
          <article key={item.id} className="grid gap-3 rounded-2xl bg-gray-950 p-3 ring-1 ring-white/10 sm:grid-cols-[160px_1fr_auto]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl sm:aspect-auto sm:h-24">
              <CatalogImage src={item.src} alt={item.alt} fill />
            </div>
            <label className="text-xs text-gray-500">
              Légende
              <input
                className="mt-1 h-11 w-full rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
                defaultValue={item.alt}
                onBlur={(e) => {
                  const alt = e.target.value.trim();
                  if (alt && alt !== item.alt) void patchGallery(item.id, { alt });
                }}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
              <button
                type="button"
                disabled={index === 0 || Boolean(busy)}
                onClick={() => void moveGallery(index, -1)}
                className="h-9 cursor-pointer rounded-lg px-3 text-xs text-gray-300 ring-1 ring-white/10 disabled:opacity-40"
              >
                Monter
              </button>
              <button
                type="button"
                disabled={index === photos.gallery.length - 1 || Boolean(busy)}
                onClick={() => void moveGallery(index, 1)}
                className="h-9 cursor-pointer rounded-lg px-3 text-xs text-gray-300 ring-1 ring-white/10 disabled:opacity-40"
              >
                Descendre
              </button>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-xs text-[#c4a574] ring-1 ring-[#c4a574]/40">
                {busy === item.id ? "Envoi…" : "Changer"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setBusy(item.id);
                    void upload(file)
                      .then((url) => patchGallery(item.id, { src: url }))
                      .catch((err) => setError(err instanceof Error ? err.message : "Image refusée."))
                      .finally(() => setBusy(""));
                  }}
                />
              </label>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void removeGallery(item.id)}
                className="h-9 cursor-pointer rounded-lg px-3 text-xs text-red-300 ring-1 ring-red-500/30"
              >
                Retirer
              </button>
            </div>
          </article>
        ))}
      </div>
      <label className="btn-gold mt-4 inline-flex h-11 cursor-pointer items-center rounded-lg px-5 text-sm font-medium">
        {busy === "gallery" ? "Envoi…" : "+ Ajouter une photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={Boolean(busy)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void addGallery(file);
          }}
        />
      </label>
    </div>
  );
}
