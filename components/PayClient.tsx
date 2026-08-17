"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/store";
import { formatFcfa } from "@/lib/money";

export default function PayClient({ invoice }: { invoice: Invoice }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (invoice.status === "payee") {
    return (
      <div className="rounded-2xl bg-gray-950 p-8 text-center stroke-gradient [--stroke-opacity:0.2]">
        <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
        <h1 className="font-bebas mt-3 text-5xl text-white">Payé</h1>
        <p className="mt-3 text-sm text-gray-400">
          {invoice.number} · {formatFcfa(invoice.amount)}
        </p>
      </div>
    );
  }

  async function pay() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/paydunya/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error || "Paiement indisponible.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Connexion interrompue.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION · NORD FOIRE</p>
      <h1 className="font-bebas mt-3 text-5xl text-white">Payer</h1>
      <p className="mt-2 text-sm text-gray-400">
        {invoice.number} · {invoice.clientName}
      </p>
      <ul className="mt-6 space-y-2 border-y border-white/10 py-5 text-sm">
        {invoice.items.map((line, index) => (
          <li key={`${line.name}-${index}`} className="flex justify-between gap-4 text-gray-300">
            <span>
              {line.name}
              {line.qty > 1 ? ` × ${line.qty}` : ""}
            </span>
            <span>{formatFcfa(line.qty * line.unitPrice)}</span>
          </li>
        ))}
        <li className="flex justify-between pt-2 text-white">
          <span>Total</span>
          <span className="font-bebas text-3xl">{formatFcfa(invoice.amount)}</span>
        </li>
      </ul>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <button type="button" disabled={sending || invoice.amount <= 0} onClick={() => void pay()} className="btn-gold mt-6 h-12 w-full cursor-pointer rounded-lg text-sm font-medium disabled:opacity-60">
        {sending ? "Ouverture…" : "Payer par Wave / Orange Money / Free"}
      </button>
      <p className="mt-3 text-center text-xs text-gray-500">Paiement sécurisé PayDunya. Espèces aussi acceptées au salon.</p>
    </div>
  );
}
