"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Membership, PublicClient } from "@/lib/store";
import { formatFcfa } from "@/lib/money";

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}`;
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as {
      clients?: PublicClient[];
      memberships?: Membership[];
      error?: string;
    };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setClients(json.clients || []);
    setMemberships(json.memberships || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeByClient = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const item of memberships) {
      if (item.status !== "actif") continue;
      if (!map.has(item.clientId)) map.set(item.clientId, item);
    }
    return map;
  }, [memberships]);

  async function adjust(id: string, pointsDelta: number) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsDelta, note: pointsDelta > 0 ? "Ajustement salon +" : "Ajustement salon −" }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { client: PublicClient };
      setClients((current) => current.map((item) => (item.id === id ? json.client : item)));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
      <h1 className="font-bebas mt-2 text-5xl text-white">Clients</h1>
      <p className="mt-2 text-sm text-gray-400">
        {clients.length} compte{clients.length > 1 ? "s" : ""} · points, crédit salon, abonnements
      </p>
      {error ? <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {clients.length === 0 && !error ? <p className="mt-10 text-sm text-gray-500">Aucun compte client pour le moment.</p> : null}
      <ul className="mt-8 space-y-3">
        {clients.map((client) => {
          const abo = activeByClient.get(client.id);
          return (
            <li key={client.id} className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bebas text-3xl text-white">{client.name}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                </div>
                <a href={waLink(client.phone)} target="_blank" rel="noreferrer" className="text-sm text-[#c4a574] hover:text-white">
                  WhatsApp
                </a>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-gray-500">Points</dt>
                  <dd className="mt-1 text-white">{client.points}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Crédit</dt>
                  <dd className="mt-1 text-white">{formatFcfa(client.creditFcfa)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Abonnement</dt>
                  <dd className="mt-1 text-white">
                    {abo
                      ? `${abo.planName} · ${Math.max(0, abo.visitsTotal - abo.visitsUsed)} visites`
                      : "Aucun"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fin</dt>
                  <dd className="mt-1 text-white">
                    {abo ? new Date(abo.expiresAt).toLocaleDateString("fr-FR") : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === client.id}
                  onClick={() => void adjust(client.id, 10)}
                  className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-xs text-white ring-1 ring-white/10 hover:bg-gray-800 disabled:opacity-50"
                >
                  +10 pts
                </button>
                <button
                  type="button"
                  disabled={busy === client.id || client.points < 10}
                  onClick={() => void adjust(client.id, -10)}
                  className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-xs text-white ring-1 ring-white/10 hover:bg-gray-800 disabled:opacity-50"
                >
                  −10 pts
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
