"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking, BookingStatus, Invoice } from "@/lib/store";
import { formatFcfa } from "@/lib/money";

const FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "aujourd-hui", label: "Aujourd'hui" },
  { id: "nouveau", label: "Nouveaux" },
  { id: "confirme", label: "Confirmés" },
  { id: "impaye", label: "Impayés" },
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paydunyaReady, setPaydunyaReady] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("tous");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { bookings?: Booking[]; invoices?: Invoice[]; paydunyaReady?: boolean; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setBookings(json.bookings || []);
    setInvoices(json.invoices || []);
    setPaydunyaReady(Boolean(json.paydunyaReady));
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

  async function ensureInvoice(bookingId: string) {
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const json = (await res.json()) as { invoice?: Invoice; error?: string };
    if (!res.ok || !json.invoice) throw new Error(json.error || "Facture impossible.");
    setInvoices((current) => {
      const rest = current.filter((item) => item.id !== json.invoice!.id);
      return [json.invoice!, ...rest];
    });
    setBookings((current) =>
      current.map((item) => (item.id === bookingId ? { ...item, invoiceId: json.invoice!.id, amount: json.invoice!.amount } : item)),
    );
    return json.invoice;
  }

  async function encaisser(booking: Booking, method: "especes" | "wave" | "orange" | "free") {
    setBusy(`${booking.id}-${method}`);
    setError("");
    try {
      const invoice = booking.invoiceId ? invoices.find((item) => item.id === booking.invoiceId) || (await ensureInvoice(booking.id)) : await ensureInvoice(booking.id);
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, method }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Encaissement impossible.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encaissement impossible.");
    } finally {
      setBusy("");
    }
  }

  async function payerMobile(booking: Booking) {
    setBusy(`${booking.id}-mm`);
    setError("");
    try {
      const invoice = booking.invoiceId ? invoices.find((item) => item.id === booking.invoiceId) || (await ensureInvoice(booking.id)) : await ensureInvoice(booking.id);
      const res = await fetch(`/api/admin/invoices/${invoice.id}/paydunya`, { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "PayDunya indisponible.");
      window.open(json.url, "_blank", "noopener,noreferrer");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PayDunya indisponible.");
    } finally {
      setBusy("");
    }
  }

  const today = todayIso();
  const visible = useMemo(() => {
    return bookings.filter((item) => {
      if (filter === "tous") return true;
      if (filter === "aujourd-hui") return item.dateIso === today;
      if (filter === "impaye") return item.paymentStatus !== "paid" && item.status !== "annule";
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
    unpaid: bookings.filter((item) => item.paymentStatus !== "paid" && item.status !== "annule").length,
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">NORD FOIRE</p>
          <h1 className="font-bebas mt-1 text-5xl text-white">Agenda</h1>
        </div>
        {!paydunyaReady ? <p className="text-xs text-gray-500">PayDunya : clés à ajouter pour Wave / Orange / Free.</p> : null}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { k: "Aujourd'hui", v: stats.today },
          { k: "Nouveaux", v: stats.nouveau },
          { k: "Impayés", v: stats.unpaid },
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
                          <span className="mx-2 text-gray-600">·</span>
                          <span className="text-white">{formatFcfa(item.amount)}</span>
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
                      <div className="flex flex-col items-end gap-2">
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
                        <span className={`text-xs ${item.paymentStatus === "paid" ? "text-emerald-300" : "text-gray-500"}`}>
                          {item.paymentStatus === "paid" ? "Payé" : item.paymentStatus === "pending" ? "Paiement en cours" : "Impayé"}
                        </span>
                      </div>
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
                      {item.invoiceId ? (
                        <Link href={`/admin/factures/${item.invoiceId}`} className="flex h-9 items-center rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800">
                          Facture
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void ensureInvoice(item.id).then((invoice) => router.push(`/admin/factures/${invoice.id}`))}
                          className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800"
                        >
                          Facturer
                        </button>
                      )}
                      {item.paymentStatus !== "paid" && item.status !== "annule" ? (
                        <>
                          <button type="button" disabled={busy.startsWith(item.id)} onClick={() => void encaisser(item, "especes")} className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800 disabled:opacity-50">
                            Espèces
                          </button>
                          <button type="button" disabled={busy.startsWith(item.id)} onClick={() => void encaisser(item, "wave")} className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800 disabled:opacity-50">
                            Wave
                          </button>
                          <button type="button" disabled={Boolean(busy)} onClick={() => void payerMobile(item)} className="btn-gold h-9 cursor-pointer rounded-lg px-3 text-sm font-medium disabled:opacity-50">
                            Mobile Money
                          </button>
                        </>
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
