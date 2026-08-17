"use client";

import { FormEvent, useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { services } from "@/lib/data";

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

export default function BookingForm() {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<"salon" | "domicile">("salon");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const service = String(data.get("service") || "").trim();
    const address = String(data.get("address") || "").trim();
    if (!name || !phone || !service || !selected || !time) {
      setError("Merci de renseigner le nom, le téléphone, le jour, l'heure et la prestation.");
      setSent(false);
      return;
    }
    if (place === "domicile" && !address) {
      setError("Pour une coiffure à domicile, indiquez le quartier et l'adresse.");
      setSent(false);
      return;
    }
    setError("");
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7 rounded-2xl bg-gray-950 p-6 stroke-gradient [--stroke-opacity:0.2] sm:p-8">
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
          <p className="mt-3 text-sm capitalize text-gray-400">
            {weekdayLabel(selected)} {selected.getDate()} {MONTHS[selected.getMonth()]} {selected.getFullYear()}
          </p>
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
                  onClick={() => setTime(slot)}
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
          className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Téléphone *
        <input
          name="phone"
          type="tel"
          className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Email
        <input
          name="email"
          type="email"
          className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
        />
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

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {sent ? (
        <p className="text-sm text-gray-200">
          Demande envoyée
          {selected && time
            ? ` pour le ${selected.getDate()} ${MONTHS[selected.getMonth()]} à ${time}`
            : ""}
          {place === "domicile" ? ", à domicile" : ", au salon"}. Nous confirmons par téléphone.
        </p>
      ) : null}

      <button type="submit" className="btn-gold h-12 cursor-pointer rounded-lg text-sm font-medium active:scale-[0.98]">
        Confirmer le rendez-vous
      </button>
      <p className="text-xs text-gray-500">
        Salon : lun–sam 10h–21h, dim 12h–20h. À domicile : déplacement 2 000 F, Dakar uniquement.
      </p>
    </form>
  );
}
