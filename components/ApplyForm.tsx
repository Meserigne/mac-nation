"use client";

import { FormEvent, useState } from "react";
import { jobs } from "@/lib/data";

type Job = (typeof jobs)[number];

export default function ApplyForm({ job, onDone }: { job: Job; onDone: () => void }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("jobId", job.id);
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/career", { method: "POST", body: data });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Envoi impossible.");
        return;
      }
      setSent(true);
      form.reset();
    } catch {
      setError("Connexion interrompue. Réessaie.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl bg-gray-900 px-5 py-4 ring-1 ring-white/10">
        <p className="text-sm text-white">Candidature envoyée.</p>
          <p className="mt-1 text-sm text-gray-400">On te recontacte si le profil correspond.</p>
        <button type="button" onClick={onDone} className="mt-4 text-sm text-[#c4a574] hover:text-white">
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6">
      <p className="text-sm text-gray-400">CV et lettre de motivation pour {job.title}.</p>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Nom complet *
        <input name="name" autoComplete="name" required className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Téléphone *
        <input name="phone" type="tel" autoComplete="tel" required className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Email *
        <input name="email" type="email" autoComplete="email" required className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        CV * <span className="text-xs text-gray-500">PDF, Word ou image · 1,2 Mo max</span>
        <input name="cv" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf" required className="text-sm text-gray-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#c4a574] file:px-3 file:py-2 file:text-sm file:font-medium file:text-black" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Lettre de motivation *
        <textarea name="letter" rows={6} required placeholder="Pourquoi MAC NATION, ton parcours, ta dispo…" className="rounded-lg bg-gray-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-600 focus:ring-[#c4a574]/50" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Lettre en fichier <span className="text-xs text-gray-500">Optionnel</span>
        <input name="letterFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf" className="text-sm text-gray-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:text-white" />
      </label>
      {error ? <p className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={sending} className="btn-gold h-12 cursor-pointer rounded-lg px-6 text-sm font-medium disabled:opacity-70">
          {sending ? "Envoi…" : "Envoyer la candidature"}
        </button>
        <button type="button" onClick={onDone} className="h-12 cursor-pointer rounded-lg bg-gray-900 px-5 text-sm text-white ring-1 ring-white/10">
          Annuler
        </button>
      </div>
    </form>
  );
}
