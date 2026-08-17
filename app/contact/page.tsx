"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import { pageImages, people } from "@/lib/assets";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !email || !message) {
      setError("Merci de renseigner le nom, l'email et le message.");
      setSent(false);
      return;
    }
    setError("");
    setSent(true);
    e.currentTarget.reset();
  }

  return (
    <main>
      <PageHero
        title="Contactez-nous"
        subtitle="Salon de Nord Foire, Dakar. Réservation, boutique, abonnement ou candidature : écrivez-nous."
        image={pageImages.contact}
      />
      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 pb-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl">
          <Image
            src={people.reception}
            alt="Accueil MAC NATION Nord Foire"
            fill
            className="object-cover"
            sizes="50vw"
          />
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]">
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Nom complet *
            <input
              name="name"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Email *
            <input
              name="email"
              type="email"
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
              className="rounded-lg bg-gray-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-white/30"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {sent ? <p className="text-sm text-gray-200">Message envoyé. Nous vous répondrons dès que possible.</p> : null}
          <button
            type="submit"
            className="btn-gold h-12 cursor-pointer rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
          >
            Envoyer le message
          </button>
          <p className="text-xs text-gray-500">Nous respectons votre vie privée. Vos informations ne seront jamais partagées.</p>
        </form>
      </section>
    </main>
  );
}
