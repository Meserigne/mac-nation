"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatFcfa } from "@/lib/money";

type SoftPayMethod = "wave" | "orange" | "free";
type SoftPayResult =
  | { method: "wave"; message: string; url: string; error?: string }
  | { method: "orange"; message: string; qr: string; omUrl: string; maxitUrl: string; error?: string }
  | { method: "free"; message: string; error?: string };

type Props = {
  invoiceId: string;
  amount: number;
  name: string;
  phone: string;
  email?: string;
  hideAmount?: boolean;
};

const METHODS: { id: SoftPayMethod; label: string; hint: string }[] = [
  { id: "wave", label: "Wave", hint: "Ouvre Wave, tu restes ici" },
  { id: "orange", label: "Orange Money", hint: "QR ou app Orange / Maxit" },
  { id: "free", label: "Free Money", hint: "Valide avec #150#" },
];

function suggestedMethod(phone: string): SoftPayMethod {
  const digits = phone.replace(/\D/g, "").slice(-9);
  if (digits.startsWith("76")) return "free";
  if (digits.startsWith("77") || digits.startsWith("78")) return "orange";
  return "wave";
}

export default function SoftPay({ invoiceId, amount, name, phone, email, hideAmount }: Props) {
  const [method, setMethod] = useState<SoftPayMethod>(() => suggestedMethod(phone));
  const [payerPhone, setPayerPhone] = useState(phone);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [paid, setPaid] = useState(false);
  const [result, setResult] = useState<SoftPayResult | null>(null);

  useEffect(() => {
    if (!waiting || paid) return;
    let stop = false;
    async function tick() {
      const res = await fetch(`/api/paydunya/status?invoice=${encodeURIComponent(invoiceId)}&method=${method}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { paid?: boolean } | null;
      if (!stop && json?.paid) setPaid(true);
    }
    const id = window.setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [waiting, paid, invoiceId, method]);

  async function pay() {
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/paydunya/softpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          method,
          phone: payerPhone,
          name,
          email: email || "",
        }),
      });
      const json = (await res.json().catch(() => null)) as (SoftPayResult & { error?: string }) | null;
      if (!res.ok || !json || json.error) {
        setError(json?.error || "Paiement indisponible.");
        return;
      }
      setResult(json);
      setWaiting(true);
      if (json.method === "wave" && json.url) {
        const opened = window.open(json.url, "_blank", "noopener,noreferrer");
        if (!opened) setError("Autorise l’ouverture de Wave, puis clique Ouvrir Wave.");
      }
    } catch {
      setError("Connexion interrompue. Réessaie.");
    } finally {
      setSending(false);
    }
  }

  if (paid) {
    return (
      <div className="text-center">
        <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
        <h2 className="font-bebas mt-3 text-5xl text-white">Payé</h2>
        <p className="mt-3 text-sm text-gray-400">{formatFcfa(amount)}. Merci, à tout à l’heure au salon.</p>
        <Link href="/" className="btn-gold mt-8 inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-medium">
          Retour au site
        </Link>
      </div>
    );
  }

  return (
    <div>
      {!hideAmount ? <p className="font-bebas text-3xl text-white">{formatFcfa(amount)}</p> : null}
      <p className={`text-sm text-gray-400 ${hideAmount ? "" : "mt-1"}`}>Choisis ton moyen. Tu restes sur MAC NATION.</p>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {METHODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMethod(item.id);
              setResult(null);
              setWaiting(false);
              setError("");
            }}
            className={`cursor-pointer rounded-xl px-4 py-3 text-left ${
              method === item.id ? "btn-gold" : "bg-gray-900 text-gray-200 ring-1 ring-white/10 hover:bg-gray-800"
            }`}
          >
            <span className="block text-sm font-medium">{item.label}</span>
            <span className={`mt-1 block text-xs ${method === item.id ? "text-black/70" : "text-gray-500"}`}>{item.hint}</span>
          </button>
        ))}
      </div>

      <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
        Numéro Mobile Money
        <input
          value={payerPhone}
          onChange={(e) => setPayerPhone(e.target.value)}
          type="tel"
          autoComplete="tel"
          className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
        />
      </label>

      {result?.method === "orange" ? (
        <div className="mt-5 rounded-xl bg-white p-4 text-center">
          {result.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.qr} alt="QR Orange Money" className="mx-auto h-52 w-52" />
          ) : null}
          <p className="mt-3 text-sm text-gray-800">{result.message}</p>
          <div className="mt-3 flex flex-col gap-2">
            {result.omUrl ? (
              <a href={result.omUrl} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#ff7900] text-sm font-medium text-black">
                Ouvrir Orange Money
              </a>
            ) : null}
            {result.maxitUrl ? (
              <a href={result.maxitUrl} className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 text-sm text-white">
                Ouvrir Maxit
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {result?.method === "wave" ? (
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="btn-gold mt-5 flex h-12 items-center justify-center rounded-lg text-sm font-medium"
        >
          Ouvrir Wave
        </a>
      ) : null}

      {result?.method === "free" ? (
        <p className="mt-5 rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-200 ring-1 ring-white/10">{result.message}</p>
      ) : null}

      {waiting ? <p className="mt-4 text-sm text-[#c4a574]">En attente de confirmation sur ton téléphone…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      {!waiting ? (
        <button type="button" disabled={sending} onClick={() => void pay()} className="btn-gold mt-6 h-12 w-full cursor-pointer rounded-lg text-sm font-medium disabled:opacity-70">
          {sending ? "Préparation…" : `Payer avec ${METHODS.find((item) => item.id === method)?.label}`}
        </button>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={() => void pay()}
          className="mt-4 h-12 w-full cursor-pointer rounded-lg bg-gray-900 text-sm text-white ring-1 ring-white/10 disabled:opacity-70"
        >
          Relancer le paiement
        </button>
      )}
    </div>
  );
}
