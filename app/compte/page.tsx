"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Booking, BookingStatus, Invoice, LoyaltyEvent, Membership, PublicClient } from "@/lib/store";
import { formatFcfa } from "@/lib/money";

type Dashboard = {
  client: PublicClient;
  membership: Membership | null;
  memberships: Membership[];
  loyalty: LoyaltyEvent[];
  bookings: Booking[];
  invoices: Invoice[];
  redeemPoints: number;
  redeemFcfa: number;
};

const BOOKING_LABEL: Record<BookingStatus, string> = {
  nouveau: "En attente",
  confirme: "Confirmé",
  termine: "Terminé",
  annule: "Annulé",
};

function dateFr(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ComptePage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/compte/me", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/compte/login");
      return;
    }
    const json = (await res.json()) as Dashboard & { error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setData(json);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/compte/logout", { method: "POST" });
    router.replace("/compte/login");
    router.refresh();
  }

  async function redeem() {
    setBusy("redeem");
    setError("");
    try {
      const res = await fetch("/api/compte/redeem", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Échange impossible.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  async function cancelMembership() {
    if (!window.confirm("Arrêter l'abonnement en cours ? Les visites restantes ne seront plus utilisables.")) return;
    setBusy("abo");
    setError("");
    try {
      const res = await fetch("/api/compte/membership", { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Impossible d'arrêter l'abonnement.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = new FormData(form);
    setBusy("profile");
    setError("");
    setProfileMsg("");
    try {
      const res = await fetch("/api/compte/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(payload.get("name") || "").trim(),
          email: String(payload.get("email") || "").trim(),
          pin: String(payload.get("pin") || "").trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Enregistrement impossible.");
        return;
      }
      const pinInput = form.querySelector<HTMLInputElement>('input[name="pin"]');
      if (pinInput) pinInput.value = "";
      setProfileMsg("Profil enregistré.");
      await load();
    } finally {
      setBusy("");
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-6 pt-32 pb-20">
        <p className="text-sm text-gray-500">{error || "Chargement de ton espace…"}</p>
      </main>
    );
  }

  const { client, membership } = data;
  const upcoming = data.bookings.filter((item) => item.status === "nouveau" || item.status === "confirme");
  const past = data.bookings.filter((item) => item.status === "termine" || item.status === "annule").slice(0, 8);
  const purchases = data.invoices.filter((item) => item.status === "payee").slice(0, 8);
  const visitsLeft = membership ? Math.max(0, membership.visitsTotal - membership.visitsUsed) : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 pt-32 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">ESPACE CLIENT</p>
          <h1 className="font-bebas mt-2 text-5xl text-white sm:text-6xl">Salut {client.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-gray-400">{client.phone}</p>
        </div>
        <button type="button" onClick={() => void logout()} className="cursor-pointer text-sm text-gray-500 hover:text-white">
          Déconnexion
        </button>
      </div>

      {error ? <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl bg-gray-950 p-6 ring-1 ring-white/10">
          <p className="text-xs tracking-[0.18em] text-[#c4a574]">FIDÉLITÉ</p>
          <p className="font-bebas mt-3 text-5xl text-white">{client.points}</p>
          <p className="text-sm text-gray-500">points</p>
          <button
            type="button"
            disabled={client.points < data.redeemPoints || busy === "redeem"}
            onClick={() => void redeem()}
            className="btn-gold mt-5 h-11 w-full cursor-pointer rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "redeem" ? "Échange…" : `Échanger ${data.redeemPoints} pts · ${formatFcfa(data.redeemFcfa)}`}
          </button>
        </article>
        <article className="rounded-2xl bg-gray-950 p-6 ring-1 ring-white/10">
          <p className="text-xs tracking-[0.18em] text-[#c4a574]">CRÉDIT SALON</p>
          <p className="font-bebas mt-3 text-5xl text-white">{formatFcfa(client.creditFcfa)}</p>
          <p className="mt-2 text-sm text-gray-500">À déduire à la caisse, Nord Foire.</p>
        </article>
        <article className="rounded-2xl bg-gray-950 p-6 ring-1 ring-white/10">
          <p className="text-xs tracking-[0.18em] text-[#c4a574]">ABONNEMENT</p>
          {membership ? (
            <>
              <p className="font-bebas mt-3 text-4xl text-white">{membership.planName}</p>
              <p className="mt-2 text-sm text-gray-400">
                {visitsLeft} visite{visitsLeft > 1 ? "s" : ""} restante{visitsLeft > 1 ? "s" : ""} · jusqu&apos;au {dateFr(membership.expiresAt)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{membership.boutiquePercent}% sur la boutique</p>
            </>
          ) : (
            <>
              <p className="font-bebas mt-3 text-4xl text-white">Aucun</p>
              <p className="mt-2 text-sm text-gray-500">Prends un forfait pour tes visites du mois.</p>
            </>
          )}
          <Link
            href={membership ? `/abonnements/payer/${membership.planId}` : "/abonnements"}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800"
          >
            {membership ? "Renouveler" : "Voir les abonnements"}
          </Link>
          {membership ? (
            <button
              type="button"
              disabled={busy === "abo"}
              onClick={() => void cancelMembership()}
              className="mt-2 h-10 w-full cursor-pointer text-xs text-gray-500 hover:text-white disabled:opacity-50"
            >
              Arrêter l&apos;abonnement
            </button>
          ) : null}
        </article>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-bebas text-3xl text-white">Rendez-vous</h2>
            <Link href="/rendez-vous" className="text-sm text-[#c4a574] hover:text-white">
              Réserver
            </Link>
          </div>
          {upcoming.length === 0 ? <p className="mt-4 text-sm text-gray-500">Aucun rendez-vous à venir.</p> : null}
          <ul className="mt-4 space-y-3">
            {upcoming.map((item) => (
              <li key={item.id} className="rounded-xl bg-gray-950 px-4 py-4 ring-1 ring-white/10">
                <p className="text-sm text-white">
                  {item.dateLabel} · {item.time}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {item.serviceName} · {BOOKING_LABEL[item.status]}
                </p>
              </li>
            ))}
          </ul>
          {past.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {past.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm text-gray-500">
                  <span>
                    {item.dateLabel} · {item.serviceName}
                  </span>
                  <span>{BOOKING_LABEL[item.status]}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <h2 className="font-bebas text-3xl text-white">Achats</h2>
          {purchases.length === 0 ? <p className="mt-4 text-sm text-gray-500">Aucun paiement enregistré.</p> : null}
          <ul className="mt-4 space-y-3">
            {purchases.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 rounded-xl bg-gray-950 px-4 py-4 ring-1 ring-white/10">
                <div>
                  <p className="text-sm text-white">{item.items[0]?.name || item.number}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.number} · {dateFr(item.paidAt || item.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-gray-200">{formatFcfa(item.amount)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-bebas text-3xl text-white">Mouvements points</h2>
        {data.loyalty.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Tes points apparaissent dès le premier paiement.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 rounded-2xl bg-gray-950 ring-1 ring-white/10">
            {data.loyalty.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-gray-400">
                  {dateFr(item.createdAt)} · {item.label}
                </span>
                <span className={item.points >= 0 ? "text-[#c4a574]" : "text-gray-300"}>
                  {item.points > 0 ? "+" : ""}
                  {item.points} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 rounded-2xl bg-gray-950 p-6 ring-1 ring-white/10 sm:p-8">
        <h2 className="font-bebas text-3xl text-white">Profil</h2>
        <form onSubmit={saveProfile} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Nom
            <input
              name="name"
              defaultValue={client.name}
              key={client.name}
              required
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Email
            <input
              name="email"
              type="email"
              defaultValue={client.email}
              key={client.email}
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200 sm:col-span-2">
            Nouveau PIN (laisse vide pour ne pas changer)
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              autoComplete="new-password"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
          </label>
          {profileMsg ? <p className="text-sm text-[#c4a574] sm:col-span-2">{profileMsg}</p> : null}
          <button
            type="submit"
            disabled={busy === "profile"}
            className="btn-gold h-12 cursor-pointer rounded-lg text-sm font-medium disabled:opacity-70 sm:col-span-2"
          >
            {busy === "profile" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>
    </main>
  );
}
