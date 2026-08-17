"use client";

import { FormEvent, useState } from "react";
import { formatFcfa } from "@/lib/money";

type Props = {
  kind: "boutique" | "abonnement";
  itemId: string;
  title: string;
  amount: number;
  showQty?: boolean;
  hint: string;
};

export default function CheckoutForm({ kind, itemId, title, amount, showQty, hint }: Props) {
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const total = amount * (showQty ? qty : 1);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          itemId,
          qty: showQty ? qty : 1,
          name: String(data.get("name") || "").trim(),
          phone: String(data.get("phone") || "").trim(),
          email: String(data.get("email") || "").trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !json?.url) {
        setError(json?.error || "Paiement indisponible.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Connexion interrompue. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-2xl bg-gray-950 p-6 stroke-gradient [--stroke-opacity:0.2] sm:p-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION · NORD FOIRE</p>
      <h1 className="font-bebas mt-3 text-5xl text-white">{title}</h1>
      <p className="mt-2 text-sm text-gray-400">{hint}</p>
      <p className="font-bebas mt-6 text-4xl text-white">{formatFcfa(total)}</p>
      {showQty ? (
        <label className="mt-6 flex flex-col gap-2 text-sm text-gray-200">
          Quantité
          <select
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
        Nom complet *
        <input name="name" autoComplete="name" required className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
        Téléphone *
        <input name="phone" type="tel" autoComplete="tel" required className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
        Email
        <input name="email" type="email" autoComplete="email" className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50" />
      </label>
      {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      <button type="submit" disabled={sending} className="btn-gold mt-6 h-12 w-full cursor-pointer rounded-lg text-sm font-medium disabled:opacity-70">
        {sending ? "Ouverture du paiement…" : "Payer par Wave / Orange Money / Free"}
      </button>
      <p className="mt-3 text-center text-xs text-gray-500">Paiement sécurisé PayDunya. Espèces aussi acceptées au salon.</p>
    </form>
  );
}
