"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicAdmin, PublicClient } from "@/lib/store";

const field =
  "h-11 w-full rounded-lg bg-gray-900 px-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#c4a574]/50";

export default function AccessManager() {
  const router = useRouter();
  const [admins, setAdmins] = useState<PublicAdmin[] | null>(null);
  const [envFallback, setEnvFallback] = useState(false);
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pins, setPins] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [accessRes, salonRes] = await Promise.all([
      fetch("/api/admin/access", { cache: "no-store" }),
      fetch("/api/admin/salon", { cache: "no-store" }),
    ]);
    if (accessRes.status === 401 || salonRes.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const access = (await accessRes.json()) as { admins?: PublicAdmin[]; envFallback?: boolean; error?: string };
    const salon = (await salonRes.json()) as { clients?: PublicClient[]; error?: string };
    if (!accessRes.ok) {
      setError(access.error || "Chargement impossible.");
      return;
    }
    if (!salonRes.ok) {
      setError(salon.error || "Chargement des clients impossible.");
      return;
    }
    setAdmins(access.admins || []);
    setEnvFallback(Boolean(access.envFallback));
    setClients(salon.clients || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((item) => `${item.name} ${item.phone} ${item.email}`.toLowerCase().includes(q));
  }, [clients, query]);

  async function send(body: Record<string, string>) {
    setBusy(body.id || body.action);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Enregistrement impossible.");
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy("");
    }
  }

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== newPassword2) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const ok = await send({ action: "create", name: newName, password: newPassword });
    if (ok) {
      setNewName("");
      setNewPassword("");
      setNewPassword2("");
      setSaved("Compte backoffice créé.");
    }
  }

  async function saveAdminPassword(id: string) {
    const password = (passwords[id] || "").trim();
    const ok = await send({ action: "update", id, password });
    if (ok) {
      setPasswords((current) => ({ ...current, [id]: "" }));
      setSaved("Mot de passe mis à jour.");
    }
  }

  async function removeAdmin(id: string) {
    if (!confirm("Supprimer ce compte backoffice ?")) return;
    const ok = await send({ action: "delete", id });
    if (ok) setSaved("Compte supprimé.");
  }

  async function resetPin(id: string) {
    const pin = (pins[id] || "").trim();
    setBusy(id);
    setError("");
    setSaved("");
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = (await res.json()) as { client?: PublicClient; error?: string };
      if (!res.ok || !json.client) {
        setError(json.error || "PIN impossible à enregistrer.");
        return;
      }
      setClients((current) => current.map((item) => (item.id === id ? json.client! : item)));
      setPins((current) => ({ ...current, [id]: "" }));
      setSaved(`PIN mis à jour pour ${json.client.name}.`);
    } finally {
      setBusy("");
    }
  }

  if (!admins) {
    return <p className="mt-10 text-sm text-gray-500">{error || "Chargement des accès…"}</p>;
  }

  return (
    <div>
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
      <h1 className="font-bebas mt-2 text-5xl text-white">Accès</h1>
      <p className="mt-2 max-w-[64ch] text-sm text-gray-400">
        Mots de passe du backoffice et codes PIN des comptes clients. Les mots de passe ne sont jamais affichés.
      </p>
      {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-[#c4a574]">{saved}</p> : null}

      <section className="mt-10">
        <h2 className="font-bebas text-3xl text-white">Backoffice</h2>
        <p className="mt-2 text-sm text-gray-400">
          {envFallback
            ? "Le mot de passe d'environnement reste un accès de secours, en plus des comptes ci-dessous."
            : "Connexion uniquement avec les comptes créés ici."}
        </p>
        <ul className="mt-5 space-y-3">
          {admins.map((admin) => (
            <li key={admin.id} className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bebas text-3xl text-white">{admin.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Créé le {new Date(admin.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void removeAdmin(admin.id)}
                  className="h-9 cursor-pointer rounded-lg px-3 text-xs text-red-300 ring-1 ring-red-500/30 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nouveau mot de passe (8 caractères min.)"
                  className={field}
                  value={passwords[admin.id] || ""}
                  onChange={(e) => setPasswords((current) => ({ ...current, [admin.id]: e.target.value }))}
                />
                <button
                  type="button"
                  disabled={Boolean(busy) || !(passwords[admin.id] || "").trim()}
                  onClick={() => void saveAdminPassword(admin.id)}
                  className="btn-gold h-11 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium disabled:opacity-50"
                >
                  {busy === admin.id ? "Enregistrement…" : "Changer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {admins.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Aucun compte équipe pour le moment. Ajoute-en un ci-dessous.</p>
        ) : null}

        <form onSubmit={(e) => void addAdmin(e)} className="mt-6 space-y-3 rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
          <p className="text-sm font-medium text-white">Nouveau compte backoffice</p>
          <input
            className={field}
            placeholder="Nom (ex. Direction, Accueil)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              placeholder="Mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              placeholder="Confirmer"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" disabled={Boolean(busy)} className="btn-gold h-11 cursor-pointer rounded-lg px-5 text-sm font-medium disabled:opacity-70">
            {busy === "create" ? "Création…" : "Ajouter le compte"}
          </button>
        </form>
      </section>

      <section className="mt-14">
        <h2 className="font-bebas text-3xl text-white">PIN clients</h2>
        <p className="mt-2 text-sm text-gray-400">
          Réinitialise le code PIN (4 à 6 chiffres) pour qu&apos;un client puisse se reconnecter. Communique-lui le nouveau code une seule fois.
        </p>
        <input
          className={`${field} mt-5 max-w-md`}
          placeholder="Rechercher un client"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">Aucun client à afficher.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {filtered.map((client) => (
              <li key={client.id} className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bebas text-3xl text-white">{client.name}</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {client.phone || "Sans téléphone"}
                      {client.email ? ` · ${client.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {client.hasPin ? "PIN déjà défini" : "Pas de PIN (connexion réseau social)"}
                      {client.providers.length ? ` · ${client.providers.join(", ")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    className={field}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    minLength={4}
                    maxLength={6}
                    placeholder="Nouveau PIN"
                    value={pins[client.id] || ""}
                    onChange={(e) => setPins((current) => ({ ...current, [client.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  />
                  <button
                    type="button"
                    disabled={Boolean(busy) || (pins[client.id] || "").length < 4}
                    onClick={() => void resetPin(client.id)}
                    className="btn-gold h-11 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium disabled:opacity-50"
                  >
                    {busy === client.id ? "Enregistrement…" : "Réinitialiser"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
