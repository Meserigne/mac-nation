"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Payment } from "@/lib/store";
import { formatFcfa, methodLabel, PAYMENT_METHODS } from "@/lib/money";

export default function PaiementsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("Coupe");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("especes");
  const [clientName, setClientName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { payments?: Payment[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setPayments(json.payments || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        amount: Number(amount),
        label,
        clientName,
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Enregistrement impossible.");
      return;
    }
    setAmount("");
    setClientName("");
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">ENCAISSEMENTS</p>
      <h1 className="font-bebas mt-1 text-5xl text-white">Paiements</h1>

      <form onSubmit={onSubmit} className="mt-8 grid gap-3 rounded-2xl bg-gray-950 p-5 stroke-gradient [--stroke-opacity:0.15] sm:grid-cols-5">
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client" className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé" className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Montant" required className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10" />
        <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10">
          {PAYMENT_METHODS.filter((item) => item.id !== "paydunya").map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-gold h-11 cursor-pointer rounded-lg text-sm font-medium">
          Encaisser
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-8 space-y-3">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun paiement pour l’instant.</p>
        ) : (
          payments.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-950 p-5 stroke-gradient [--stroke-opacity:0.15]">
              <div>
                <p className="text-white">{methodLabel(item.method)}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(item.createdAt).toLocaleString("fr-FR")}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bebas text-3xl text-white">{formatFcfa(item.amount)}</p>
                {item.invoiceId ? (
                  <Link href={`/admin/factures/${item.invoiceId}`} className="text-xs text-[#c4a574] hover:underline">
                    Voir la facture
                  </Link>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
