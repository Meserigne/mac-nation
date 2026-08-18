"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, ApplicationStatus } from "@/lib/store";

const STATUS: Record<ApplicationStatus, string> = {
  nouvelle: "Nouvelle",
  vue: "Vue",
  retenue: "Retenue",
  refusee: "Refusée",
};

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}`;
}

export default function CandidaturesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { applications?: Application[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setItems(json.applications || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { application: Application };
    setItems((current) => current.map((item) => (item.id === id ? json.application : item)));
  }

  const unread = items.filter((item) => item.status === "nouvelle").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
          <h1 className="font-bebas mt-2 text-5xl text-white">Candidatures</h1>
          <p className="mt-2 text-sm text-gray-400">
            {items.length} dossier{items.length > 1 ? "s" : ""}
            {unread ? ` · ${unread} nouveau${unread > 1 ? "x" : ""}` : ""}
          </p>
        </div>
      </div>
      {error ? <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {items.length === 0 && !error ? <p className="mt-10 text-sm text-gray-500">Aucune candidature pour le moment.</p> : null}
      <ul className="mt-8 space-y-4">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <li key={item.id} className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenId(open ? "" : item.id)} className="cursor-pointer text-left">
                  <p className="font-bebas text-3xl text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {item.jobTitle} · {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </p>
                </button>
                <span className={`rounded-full px-3 py-1 text-xs ${item.status === "nouvelle" ? "bg-[#c4a574] text-black" : "bg-gray-900 text-gray-300"}`}>
                  {STATUS[item.status]}
                </span>
              </div>
              {open ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-sm text-gray-300">
                    {item.phone} · {item.email}
                  </p>
                  {item.letter ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{item.letter}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a href={`/api/admin/applications/${item.id}/file?kind=cv`} className="btn-gold inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium">
                      Télécharger le CV
                    </a>
                    {item.letterPath ? (
                      <a href={`/api/admin/applications/${item.id}/file?kind=lettre`} className="inline-flex h-10 items-center rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10">
                        Télécharger la lettre
                      </a>
                    ) : null}
                    <a href={waLink(item.phone)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg bg-gray-900 px-4 text-sm text-white ring-1 ring-white/10">
                      WhatsApp
                    </a>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["vue", "retenue", "refusee"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void setStatus(item.id, status)}
                        className="h-9 cursor-pointer rounded-lg bg-gray-900 px-3 text-xs text-gray-300 ring-1 ring-white/10 hover:text-white"
                      >
                        {STATUS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
