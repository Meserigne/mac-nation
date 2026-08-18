"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CompteLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const phone = String(data.get("phone") || "").trim();
    const pin = String(data.get("pin") || "").trim();
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    setError("");
    setSending(true);
    try {
      const res = await fetch(mode === "register" ? "/api/compte/register" : "/api/compte/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { name, phone, email, pin } : { phone, pin }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Connexion impossible.");
        return;
      }
      router.replace("/compte");
      router.refresh();
    } catch {
      setError("Connexion interrompue. Réessaie.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md items-center px-6 pt-32 pb-20">
      <form
        onSubmit={onSubmit}
        className="w-full rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]"
      >
        <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
        <h1 className="font-bebas mt-3 text-5xl text-white">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        <p className="mt-2 text-sm text-gray-500">
          Points de fidélité, abonnements, rendez-vous et achats au même endroit.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`h-10 cursor-pointer rounded-lg text-sm ${
              mode === "login" ? "btn-gold font-medium" : "bg-gray-900 text-gray-300 ring-1 ring-white/10"
            }`}
          >
            J&apos;ai un compte
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`h-10 cursor-pointer rounded-lg text-sm ${
              mode === "register" ? "btn-gold font-medium" : "bg-gray-900 text-gray-300 ring-1 ring-white/10"
            }`}
          >
            Nouveau
          </button>
        </div>
        {mode === "register" ? (
          <>
            <label className="mt-6 flex flex-col gap-2 text-sm text-gray-200">
              Nom complet *
              <input
                name="name"
                autoComplete="name"
                required
                className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
              />
            </label>
            <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
              />
            </label>
          </>
        ) : null}
        <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
          Téléphone *
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="77 123 45 67"
            className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-gray-600 focus:ring-[#c4a574]/50"
          />
        </label>
        <label className="mt-5 flex flex-col gap-2 text-sm text-gray-200">
          Code PIN (4 à 6 chiffres) *
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={4}
            maxLength={6}
            className="h-12 rounded-lg bg-gray-900 px-4 text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50"
          />
        </label>
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={sending}
          className="btn-gold mt-6 h-12 w-full cursor-pointer rounded-lg text-sm font-medium disabled:opacity-70"
        >
          {sending ? "Un instant…" : mode === "login" ? "Entrer" : "Créer mon compte"}
        </button>
        <p className="mt-4 text-center text-xs text-gray-500">
          1 000 F payés = 1 point. 10 points = 1 000 F de crédit salon.
        </p>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/rendez-vous" className="hover:text-white">
            Réserver sans compte
          </Link>
        </p>
      </form>
    </main>
  );
}
