"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { asSite, type SiteSettings } from "@/lib/catalog";

const field = "h-12 w-full rounded-lg bg-gray-900 px-4 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50";

export default function AdminSitePage() {
  const router = useRouter();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { site?: SiteSettings; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setSite(asSite(json.site));
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!site) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const current = await fetch("/api/admin/catalog", { cache: "no-store" }).then((res) => res.json());
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, site }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Enregistrement impossible.");
        return;
      }
      setSaved("Site mis à jour.");
    } finally {
      setBusy(false);
    }
  }

  if (!site) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <p className="text-sm text-gray-500">{error || "Chargement…"}</p>
      </main>
    );
  }

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSite({ ...site, [key]: value } as SiteSettings);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
      <h1 className="font-bebas mt-2 text-5xl text-white">Le site</h1>
      <p className="mt-2 text-sm text-gray-400">Adresse, horaires, contact et déplacement à domicile.</p>
      <p className="mt-2 text-sm text-gray-500">
        Les photos du site se gèrent dans{" "}
        <Link href="/admin/photos" className="text-[#c4a574] hover:underline">
          Photos
        </Link>
        .
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl bg-gray-950 p-6 ring-1 ring-white/10">
        <label className="block text-sm text-gray-200">
          Nom du salon
          <input className={`${field} mt-2`} value={site.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block text-sm text-gray-200">
          Phrase d&apos;accroche
          <input className={`${field} mt-2`} value={site.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </label>
        <label className="block text-sm text-gray-200">
          Adresse
          <input className={`${field} mt-2`} value={site.address} onChange={(e) => set("address", e.target.value)} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-gray-200">
            Ville
            <input className={`${field} mt-2`} value={site.city} onChange={(e) => set("city", e.target.value)} />
          </label>
          <label className="block text-sm text-gray-200">
            Pays
            <input className={`${field} mt-2`} value={site.country} onChange={(e) => set("country", e.target.value)} />
          </label>
        </div>
        <label className="block text-sm text-gray-200">
          Horaires
          <input className={`${field} mt-2`} value={site.hours} onChange={(e) => set("hours", e.target.value)} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-gray-200">
            Téléphone
            <input className={`${field} mt-2`} value={site.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="block text-sm text-gray-200">
            Email
            <input className={`${field} mt-2`} type="email" value={site.email} onChange={(e) => set("email", e.target.value)} />
          </label>
        </div>
        <label className="block text-sm text-gray-200">
          Frais de déplacement domicile (F)
          <input
            className={`${field} mt-2`}
            type="number"
            value={site.domicileFee}
            onChange={(e) => set("domicileFee", Number(e.target.value) || 0)}
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved ? <p className="text-sm text-[#c4a574]">{saved}</p> : null}
        <button type="submit" disabled={busy} className="btn-gold h-12 w-full cursor-pointer rounded-lg text-sm font-medium disabled:opacity-70">
          {busy ? "Enregistrement…" : "Enregistrer le site"}
        </button>
      </form>
    </main>
  );
}
