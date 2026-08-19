"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContactMessage, ContactStatus } from "@/lib/store";
import { waMeLink } from "@/lib/sms";

const STATUS: Record<ContactStatus, string> = {
  nouveau: "Nouveau",
  lu: "Lu",
  traite: "Traité",
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salon", { cache: "no-store" });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = (await res.json()) as { messages?: ContactMessage[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    setItems(json.messages || []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: ContactStatus) {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { message: ContactMessage };
    setItems((current) => current.map((item) => (item.id === id ? json.message : item)));
  }

  const unread = items.filter((item) => item.status === "nouveau").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
      <h1 className="font-bebas mt-2 text-5xl text-white">Messages</h1>
      <p className="mt-2 text-sm text-gray-400">
        {items.length} message{items.length > 1 ? "s" : ""}
        {unread ? ` · ${unread} nouveau${unread > 1 ? "x" : ""}` : ""}
      </p>
      {error ? <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      {items.length === 0 && !error ? <p className="mt-10 text-sm text-gray-500">Aucun message pour le moment.</p> : null}
      <ul className="mt-8 space-y-4">
        {items.map((item) => {
          const open = openId === item.id;
          const wa = item.phone ? waMeLink(item.phone) : "";
          return (
            <li key={item.id} className="rounded-2xl bg-gray-950 p-5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenId(open ? "" : item.id)} className="cursor-pointer text-left">
                  <p className="font-bebas text-3xl text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {item.subject} · {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </p>
                </button>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">{STATUS[item.status]}</span>
              </div>
              {open ? (
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p>{item.email}</p>
                  {item.phone ? <p>{item.phone}</p> : null}
                  <p className="whitespace-pre-wrap text-gray-200">{item.message}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer" className="h-9 rounded-lg px-3 text-xs leading-9 text-[#c4a574] ring-1 ring-[#c4a574]/40">
                        WhatsApp
                      </a>
                    ) : null}
                    {item.email ? (
                      <a href={`mailto:${item.email}`} className="h-9 rounded-lg px-3 text-xs leading-9 text-gray-300 ring-1 ring-white/10">
                        Email
                      </a>
                    ) : null}
                    {(["lu", "traite"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void setStatus(item.id, status)}
                        className="h-9 cursor-pointer rounded-lg px-3 text-xs text-white ring-1 ring-white/10"
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
