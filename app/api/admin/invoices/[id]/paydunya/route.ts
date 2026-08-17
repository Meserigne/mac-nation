import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/paydunya";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const checkout = await startCheckout(id);
    return NextResponse.json({ url: checkout.url, token: checkout.token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PAYDUNYA";
    if (message === "PAYDUNYA_MISSING") {
      return NextResponse.json({ error: "Clés PayDunya manquantes. Ajoute-les dans les variables d'environnement." }, { status: 503 });
    }
    if (message === "INVOICE_MISSING") return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    if (message === "AMOUNT_ZERO") return NextResponse.json({ error: "Montant à 0. Ajuste la facture avant le paiement." }, { status: 400 });
    if (message === "ALREADY_PAID") return NextResponse.json({ error: "Cette facture est déjà payée." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer le paiement Mobile Money." }, { status: 502 });
  }
}
