"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, BookingStatus } from "@/lib/bookings";

const FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "aujourd-hui", label: "Aujourd'hui" },
  { id: "nouveau", label: "Nouveaux" },
  { id: "confirme", label: "Confirmés" },
  { id: "termine", label: "Terminés" },
  { id: "annule", label: "Annulés" },
] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}`;
}

function telLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits.startsWith("221") ? digits : `221${digits}`}`;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  nouveau: "Nouveau",
  confirme: "Confirmé",
  termine: "Terminé",
  annule: "Annulé",
};

export default function AdminPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("tous");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/bookings", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { bookings?: Booking[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setBookings(json.bookings || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: BookingStatus) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { booking: Booking };
    setBookings((current) => current.map((item) => (item.id === id ? json.booking : item)));
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const today = todayIso();
  const visible = useMemo(() => {
    return bookings.filter((item) => {
      if (filter === "tous") return true;
      if (filter === "aujourd-hui") return item.dateIso === today;
      return item.status === filter;
    });
  }, [bookings, filter, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const item of visible) {
      const key = item.dateIso || item.dateLabel;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [visible]);

  const stats = {
    today: bookings.filter((item) => item.dateIso === today && item.status !== "annule").length,
    nouveau: bookings.filter((item) => item.status === "nouveau").length,
    confirme: bookings.filter((item) => item.status === "confirme").length,
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
          <h1 className="font-bebas mt-1 text-5xl text-white">Agenda</h1>
        </div>
        <button type="button" onClick={() => void logout()} className="cursor-pointer text-sm text-gray-500 hover:text-white">
          Déconnexion
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { k: "Aujourd'hui", v: stats.today },
          { k: "Nouveaux", v: stats.nouveau },
          { k: "Confirmés", v: stats.confirme },
        ].map((item) => (
          <div key={item.k} className="rounded-2xl bg-gray-950 px-4 py-5 stroke-gradient [--stroke-opacity:0.15]">
            <p className="text-xs text-gray-500">{item.k}</p>
            <p className="font-bebas mt-1 text-4xl text-white">{item.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`h-9 cursor-pointer rounded-full px-4 text-sm ${
              filter === item.id ? "btn-gold" : "bg-gray-900 text-gray-400 ring-1 ring-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 space-y-10">
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun rendez-vous pour ce filtre.</p>
        ) : (
          grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="font-bebas text-2xl text-[#c4a574]">{items[0]?.dateLabel || day}</h2>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-gray-950 p-5 stroke-gradient [--stroke-opacity:0.15]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg text-white">
                          <span className="font-medium text-[#c4a574]">{item.time}</span>
                          <span className="mx-2 text-gray-600">·</span>
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {item.serviceName}
                          <span className="mx-2 text-gray-600">·</span>
                          {item.place === "domicile" ? `Domicile · ${item.address}` : "Salon Nord Foire"}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-3 text-sm">
                          <a className="text-[#c4a574] hover:underline" href={telLink(item.phone)}>
                            {item.phone}
                          </a>
                          <a className="text-gray-400 hover:text-white" href={waLink(item.phone)} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                          {item.email ? <span className="text-gray-500">{item.email}</span> : null}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          item.status === "nouveau"
                            ? "bg-[#c4a574]/15 text-[#c4a574]"
                            : item.status === "confirme"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : item.status === "annule"
                                ? "bg-red-500/15 text-red-300"
                                : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status !== "confirme" ? (
                        <button type="button" onClick={() => void setStatus(item.id, "confirme")} className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800">
                          Confirmer
                        </button>
                      ) : null}
                      {item.status !== "termine" ? (
                        <button type="button" onClick={() => void setStatus(item.id, "termine")} className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800">
                          Terminé
                        </button>
                      ) : null}
                      {item.status !== "annule" ? (
                        <button type="button" onClick={() => void setStatus(item.id, "annule")} className="h-9 cursor-pointer rounded-lg px-3 text-sm text-red-300 hover:bg-red-500/10">
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
