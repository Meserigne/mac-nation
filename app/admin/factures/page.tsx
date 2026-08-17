"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/lib/store";
import { formatFcfa } from "@/lib/money";
import { products, services } from "@/lib/data";

const FILTERS = [
  { id: "toutes", label: "Toutes" },
  { id: "envoyee", label: "À encaisser" },
  { id: "payee", label: "Payées" },
  { id: "brouillon", label: "Brouillons" },
  { id: "annulee", label: "Annulées" },
] as const;

const KIND: Record<NonNullable<Invoice["kind"]>, string> = {
  rdv: "RDV",
  boutique: "Boutique",
  abonnement: "Abonnement",
  caisse: "Caisse",
};

const STATUS: Record<Invoice["status"], string> = {
  brouillon: "Brouillon",
  envoyee: "À encaisser",
  payee: "Payée",
  annulee: "Annulée",
};

export default function FacturesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("toutes");
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [lineName, setLineName] = useState("Coupe");
  const [linePrice, setLinePrice] = useState("5000");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { invoices?: Invoice[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setInvoices(json.invoices || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const catalog = useMemo(
    () => [
      ...services.map((item) => ({ name: item.name, price: item.price.replace(/\D/g, "") || "0" })),
      ...products.map((item) => ({ name: item.name, price: item.price.replace(/\D/g, "") || "0" })),
    ],
    [],
  );

  const visible = invoices.filter((item) => (filter === "toutes" ? true : item.status === filter));

  async function createWalkIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientPhone,
        items: [{ name: lineName, qty: 1, unitPrice: Number(linePrice) || 0 }],
      }),
    });
    const json = (await res.json()) as { invoice?: Invoice; error?: string };
    if (!res.ok || !json.invoice) {
      setError(json.error || "Création impossible.");
      return;
    }
    setClientName("");
    setClientPhone("");
    router.push(`/admin/factures/${json.invoice.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">FACTURATION</p>
      <h1 className="font-bebas mt-1 text-5xl text-white">Factures</h1>

      <form onSubmit={createWalkIn} className="mt-8 grid gap-3 rounded-2xl bg-gray-950 p-5 stroke-gradient [--stroke-opacity:0.15] sm:grid-cols-4">
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client"
          required
          className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10"
        />
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Téléphone"
          className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10"
        />
        <select
          value={`${lineName}|${linePrice}`}
          onChange={(e) => {
            const [name, price] = e.target.value.split("|");
            setLineName(name);
            setLinePrice(price);
          }}
          className="h-11 rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10"
        >
          {catalog.map((item) => (
            <option key={`${item.name}-${item.price}`} value={`${item.name}|${item.price}`}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={linePrice}
            onChange={(e) => setLinePrice(e.target.value)}
            inputMode="numeric"
            className="h-11 w-full rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10"
          />
          <button type="submit" className="btn-gold h-11 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium">
            Créer
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`h-9 cursor-pointer rounded-full px-4 text-sm ${filter === item.id ? "btn-gold" : "bg-gray-900 text-gray-400 ring-1 ring-white/10"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-6 space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune facture.</p>
        ) : (
          visible.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/factures/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-950 p-5 stroke-gradient [--stroke-opacity:0.15]">
                <div>
                  <p className="text-white">
                    {item.number} <span className="text-gray-500">· {item.clientName}</span>
                    <span className="ml-2 text-xs text-[#c4a574]">{KIND[item.kind || "caisse"]}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{item.items.map((line) => line.name).join(", ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bebas text-3xl text-white">{formatFcfa(item.amount)}</p>
                  <p className={`text-xs ${item.status === "payee" ? "text-emerald-300" : "text-gray-500"}`}>{STATUS[item.status]}</p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
