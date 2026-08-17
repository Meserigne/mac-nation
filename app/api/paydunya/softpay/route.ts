import { NextResponse } from "next/server";
import { startSoftPay, type SoftPayMethod } from "@/lib/paydunya";

export const maxDuration = 30;

const METHODS = new Set<SoftPayMethod>(["wave", "orange", "free"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    invoiceId?: unknown;
    method?: unknown;
    phone?: unknown;
    name?: unknown;
    email?: unknown;
  } | null;

  const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  const method = typeof body?.method === "string" && METHODS.has(body.method as SoftPayMethod) ? (body.method as SoftPayMethod) : null;
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : "";

  if (!invoiceId) return NextResponse.json({ error: "Facture manquante." }, { status: 400 });
  if (!method) return NextResponse.json({ error: "Choisis Wave, Orange Money ou Free." }, { status: 400 });

  try {
    const result = await startSoftPay({ invoiceId, method, phone, name, email });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PAYDUNYA";
    if (message === "PAYDUNYA_MISSING") {
      return NextResponse.json({ error: "Paiement Mobile Money indisponible pour le moment." }, { status: 503 });
    }
    if (message === "INVOICE_MISSING") return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    if (message === "ALREADY_PAID") return NextResponse.json({ error: "Cette facture est déjà payée." }, { status: 400 });
    if (message === "AMOUNT_ZERO") return NextResponse.json({ error: "Montant à confirmer au salon." }, { status: 400 });
    if (message === "PHONE_INVALID") {
      return NextResponse.json({ error: "Indique un numéro sénégalais valide (77, 78, 76, 70…)." }, { status: 400 });
    }
    if (message.startsWith("GIST_") || message.startsWith("GH_")) {
      return NextResponse.json({ error: "Caisse occupée, réessaie dans quelques secondes." }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: message || "Impossible de lancer le paiement." }, { status: 502 });
  }
}
