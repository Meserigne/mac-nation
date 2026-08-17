"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight, CheckCircle } from "@phosphor-icons/react";
import { services } from "@/lib/data";
import { formatFcfa } from "@/lib/money";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

type Confirmation = {
  name: string;
  phone: string;
  email: string;
  service: string;
  dateLabel: string;
  time: string;
  place: "salon" | "domicile";
  address: string;
  invoiceId?: string;
  amount?: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function slotsFor(date: Date) {
  const sunday = date.getDay() === 0;
  const start = sunday ? 12 : 10;
  const last = sunday ? 19.5 : 20.5;
  const out: string[] = [];
  for (let h = start; h <= last; h += 0.5) {
    const hour = Math.floor(h);
    const min = h % 1 === 0 ? "00" : "30";
    out.push(`${String(hour).padStart(2, "0")}:${min}`);
  }
  const now = new Date();
  if (sameDay(date, now)) {
    const current = now.getHours() + now.getMinutes() / 60;
    return out.filter((s) => {
      const [hh, mm] = s.split(":").map(Number);
      return hh + mm / 60 > current + 0.5;
    });
  }
  return out;
}

function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
}

function dateLabel(date: Date) {
  return `${weekdayLabel(date)} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function BookingForm() {
  const today = startOfDay(new Date());
  const box = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<"salon" | "domicile">("salon");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Confirmation | null>(null);
  const [payNow, setPayNow] = useState(true);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (Date | null)[] = [];
    for (let i = 0; i < lead; i += 1) grid.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) grid.push(new Date(year, month, d));
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [cursor]);

  const times = selected ? slotsFor(selected) : [];

  function showMessage(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const serviceId = String(data.get("service") || "").trim();
    const address = String(data.get("address") || "").trim();
    const service = services.find((s) => s.id === serviceId);

    if (!name || !phone || !service || !selected || !time) {
      showMessage("Choisissez un jour, une heure et une prestation, puis indiquez votre nom et votre téléphone.");
      return;
    }
    if (place === "domicile" && !address) {
      showMessage("Pour une coiffure à domicile, indiquez le quartier et l'adresse.");
      return;
    }

    const email = String(data.get("email") || "").trim();
    const confirmation: Confirmation = {
      name,
      phone,
      email,
      service: `${service.name} · ${service.price}`,
      dateLabel: dateLabel(selected),
      time,
      place,
      address,
    };

    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          serviceId: service.id,
          dateLabel: confirmation.dateLabel,
          dateIso: `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`,
          time,
          place,
          address,
          payNow,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; invoiceId?: string; amount?: number; payUrl?: string } | null;
      if (!res.ok) {
        showMessage(json?.error || "Impossible d'envoyer la demande. Réessayez.");
        return;
      }
      if (payNow && json?.payUrl) {
        window.location.href = json.payUrl;
        return;
      }
      setDone({ ...confirmation, invoiceId: json?.invoiceId, amount: json?.amount });
      requestAnimationFrame(() => {
        box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch {
      showMessage("Connexion interrompue. Vérifiez internet et réessayez.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone(null);
    setSelected(null);
    setTime("");
    setPlace("salon");
    setPayNow(true);
    setError("");
  }

  return (
    <div ref={box} className="rounded-2xl bg-gray-950 p-6 stroke-gradient [--stroke-opacity:0.2] sm:p-8">
      {done ? (
        <div className="flex flex-col items-start gap-5">
          <CheckCircle size={42} weight="fill" className="text-[#c4a574]" />
          <div>
            <p className="font-bebas text-4xl text-white">Rendez-vous demandé</p>
            <p className="mt-2 text-sm text-gray-400">
              Merci {done.name}. Un SMS, un WhatsApp et un email de confirmation partent au {done.phone}
              {done.email ? ` et ${done.email}` : ""}. {done.invoiceId ? "Tu peux payer maintenant ou au salon." : "Nous vous rappelons pour confirmer."}
            </p>
          </div>
          <ul className="w-full space-y-3 border-y border-white/10 py-5 text-sm text-gray-200">
            <li className="flex justify-between gap-4">
              <span className="text-gray-500">Quand</span>
              <span className="text-right capitalize">
                {done.dateLabel} · {done.time}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-gray-500">Prestation</span>
              <span className="text-right">{done.service}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-gray-500">Lieu</span>
              <span className="text-right">
                {done.place === "domicile" ? `À domicile · ${done.address}` : "Au salon, Nord Foire"}
              </span>
            </li>
            {typeof done.amount === "number" && done.amount > 0 ? (
              <li className="flex justify-between gap-4">
                <span className="text-gray-500">Montant</span>
                <span className="text-right">{formatFcfa(done.amount)}</span>
              </li>
            ) : null}
          </ul>
          {done.invoiceId && (done.amount || 0) > 0 ? (
            <a href={`/payer/${done.invoiceId}`} className="btn-gold flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium">
              Payer maintenant · Wave / Orange / Free
            </a>
          ) : null}
          <button type="button" onClick={reset} className="h-12 w-full cursor-pointer rounded-lg bg-gray-900 text-sm text-white ring-1 ring-white/10 hover:bg-gray-800">
            Prendre un autre rendez-vous
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-7">
          <div className="rounded-xl bg-[#c4a574] p-4 text-[#0b0b0c]">
            <p className="text-sm font-medium">Paiement du rendez-vous</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayNow(true)}
                className={`cursor-pointer rounded-lg px-4 py-3 text-left text-sm ${payNow ? "bg-black text-white" : "bg-black/10 text-black"}`}
              >
                Payer maintenant
                <span className={`mt-1 block text-xs ${payNow ? "text-white/70" : "text-black/60"}`}>Wave · Orange · Free</span>
              </button>
              <button
                type="button"
                onClick={() => setPayNow(false)}
                className={`cursor-pointer rounded-lg px-4 py-3 text-left text-sm ${!payNow ? "bg-black text-white" : "bg-black/10 text-black"}`}
              >
                Payer au salon
                <span className={`mt-1 block text-xs ${!payNow ? "text-white/70" : "text-black/60"}`}>Espèces ou Mobile Money</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Lieu</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "salon", label: "Au salon", hint: "Nord Foire" },
                  { id: "domicile", label: "À domicile", hint: "+ 2 000 F" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlace(opt.id)}
                  className={`cursor-pointer rounded-xl px-4 py-3 text-left transition-colors ${
                    place === opt.id ? "btn-gold" : "bg-gray-900 text-gray-300 ring-1 ring-white/10 hover:bg-gray-800"
                  }`}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className={`mt-0.5 block text-xs ${place === opt.id ? "text-black/70" : "text-gray-500"}`}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Prestation *
            <select
              name="service"
              required
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
              defaultValue=""
            >
              <option value="" disabled>
                Choisir
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.price}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between">
              <p className="font-bebas text-2xl text-white">
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Mois précédent"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                >
                  <CaretLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Mois suivant"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                >
                  <CaretRight size={16} />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <span key={`e-${i}`} />;
                const past = startOfDay(day) < today;
                const active = selected ? sameDay(day, selected) : false;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={past}
                    onClick={() => {
                      setSelected(day);
                      setTime("");
                      setError("");
                    }}
                    className={`h-10 cursor-pointer rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-gray-700 ${
                      active ? "btn-gold font-semibold" : "text-gray-200 hover:bg-white/5 disabled:hover:bg-transparent"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            {selected ? (
              <p className="mt-3 text-sm capitalize text-gray-400">{dateLabel(selected)}</p>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Choisissez un jour.</p>
            )}
          </div>

          {selected ? (
            <div>
              <p className="text-sm font-medium text-white">Heure *</p>
              {times.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Plus de créneau ce jour-là. Choisissez une autre date.</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {times.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setTime(slot);
                        setError("");
                      }}
                      className={`h-10 cursor-pointer rounded-lg text-sm transition-colors ${
                        time === slot ? "btn-gold font-medium" : "bg-gray-900 text-gray-300 ring-1 ring-white/10 hover:bg-gray-800"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Nom complet *
            <input
              name="name"
              autoComplete="name"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Téléphone *
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-200">
            Email
            <input
              name="email"
              type="text"
              inputMode="email"
              autoComplete="email"
              className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
            />
            <span className="text-xs text-gray-500">Pour recevoir la confirmation par mail.</span>
          </label>
          {place === "domicile" ? (
            <label className="flex flex-col gap-2 text-sm text-gray-200">
              Adresse / quartier *
              <input
                name="address"
                placeholder="Ex. Nord Foire, près du service d'hygiène"
                className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-500 focus:ring-[#c4a574]/50"
              />
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="btn-gold h-12 cursor-pointer rounded-lg text-sm font-medium active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {sending ? (payNow ? "Ouverture du paiement…" : "Envoi du SMS…") : payNow ? "Réserver et payer" : "Confirmer le rendez-vous"}
          </button>
          <p className="text-xs text-gray-500">
            Salon : lun–sam 10h–21h, dim 12h–20h. À domicile : déplacement 2 000 F, Dakar uniquement.
          </p>
        </form>
      )}
    </div>
  );
}
