"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import CatalogImage from "@/components/CatalogImage";
import { photoOf } from "@/lib/site-photos";
import { useSitePhotos } from "@/lib/use-site-photos";
import { salonInfo } from "@/lib/assets";
import type { SiteSettings } from "@/lib/catalog";
import { waMeLink } from "@/lib/sms";

export default function ContactPage() {
  const photos = useSitePhotos();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState({
    address: salonInfo.address,
    city: salonInfo.city,
    country: salonInfo.country,
    hours: salonInfo.hours,
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { site?: Partial<SiteSettings> }) => {
        if (!json.site) return;
        setSite({
          address: json.site.address || salonInfo.address,
          city: json.site.city || salonInfo.city,
          country: json.site.country || salonInfo.country,
          hours: json.site.hours || salonInfo.hours,
          phone: json.site.phone || "",
          email: json.site.email || "",
        });
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !email || !message) {
      setError("Merci de renseigner le nom, l'email et le message.");
      setSent(false);
      return;
    }
    setBusy(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Envoi impossible.");
        return;
      }
      setSent(true);
      form.reset();
    } catch {
      setError("Envoi interrompu. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const wa = site.phone ? waMeLink(site.phone) : "";

  return (
    <main>
      <PageHero
        title="Contactez-nous"
        subtitle="Salon de Nord Foire, Dakar. Réservation, boutique, abonnement ou candidature : écris-nous."
        image={photoOf(photos, "contact")}
      />
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl">
            <CatalogImage src={photoOf(photos, "receptionTeam")} alt="Accueil MAC NATION Nord Foire" fill />
          </div>
          <div className="rounded-2xl bg-gray-950 p-6 stroke-gradient [--stroke-opacity:0.2]">
            <p className="font-bebas text-3xl text-white">Nord Foire</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {site.address}
              <br />
              {site.city}, {site.country}
            </p>
            <p className="mt-3 text-sm text-gray-300">{site.hours}</p>
            {site.phone ? (
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="mt-3 block text-sm text-[#c4a574] hover:text-white">
                {site.phone}
              </a>
            ) : null}
            {site.email ? (
              <a href={`mailto:${site.email}`} className="mt-2 block text-sm text-gray-400 hover:text-white">
                {site.email}
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-gold mt-5 inline-flex h-11 items-center rounded-lg px-5 text-sm font-medium">
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5 rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]">
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Nom complet *
            <input
              name="name"
              required
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Email *
            <input
              name="email"
              type="email"
              required
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Téléphone
            <input
              name="phone"
              type="tel"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Sujet
            <select
              name="subject"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
              defaultValue="reservation"
            >
              <option value="reservation">Réservation</option>
              <option value="domicile">Coiffure à domicile</option>
              <option value="abonnement">Abonnement</option>
              <option value="boutique">Boutique</option>
              <option value="recrutement">Recrutement</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Message *
            <textarea
              name="message"
              rows={5}
              required
              className="rounded-lg bg-gray-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {sent ? <p className="text-sm text-[#c4a574]">Message envoyé. On te répond dès que possible.</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="btn-gold h-12 cursor-pointer rounded-lg text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? "Envoi…" : "Envoyer le message"}
          </button>
          <p className="text-xs text-gray-500">On respecte ta vie privée. Tes informations ne seront jamais partagées.</p>
        </form>
      </section>
    </main>
  );
}
