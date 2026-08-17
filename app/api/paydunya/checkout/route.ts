import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/paydunya";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { invoiceId?: unknown } | null;
  const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  if (!invoiceId) return NextResponse.json({ error: "Facture manquante." }, { status: 400 });
  try {
    const checkout = await startCheckout(invoiceId);
    return NextResponse.json({ url: checkout.url, token: checkout.token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PAYDUNYA";
    if (message === "PAYDUNYA_MISSING") {
      return NextResponse.json({ error: "Paiement Mobile Money indisponible pour le moment." }, { status: 503 });
    }
    if (message === "INVOICE_MISSING") return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    if (message === "ALREADY_PAID") return NextResponse.json({ error: "Cette facture est déjà payée." }, { status: 400 });
    if (message === "AMOUNT_ZERO") return NextResponse.json({ error: "Montant à confirmer au salon." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Impossible d'ouvrir PayDunya." }, { status: 502 });
  }
}
