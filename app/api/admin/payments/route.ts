import { NextResponse } from "next/server";
import { createWalkInInvoice, markInvoicePaid } from "@/lib/store";
import { PAYMENT_METHODS, type InvoiceLine, type PaymentMethod } from "@/lib/money";

const METHODS = new Set<PaymentMethod>(PAYMENT_METHODS.map((item) => item.id));

function asLines(raw: unknown): InvoiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as { name?: unknown; qty?: unknown; unitPrice?: unknown };
      return {
        name: typeof item.name === "string" ? item.name.trim() : "",
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      };
    })
    .filter((line) => line.name && line.unitPrice > 0);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    invoiceId?: unknown;
    method?: unknown;
    amount?: unknown;
    note?: unknown;
    clientName?: unknown;
    clientPhone?: unknown;
    items?: unknown;
    label?: unknown;
  } | null;

  const method = typeof body?.method === "string" && METHODS.has(body.method as PaymentMethod) ? (body.method as PaymentMethod) : null;
  if (!method) return NextResponse.json({ error: "Mode de paiement invalide." }, { status: 400 });

  let invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  if (!invoiceId) {
    const items = asLines(body?.items);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const amount = Number(body?.amount) || 0;
    const lines = items.length > 0 ? items : label && amount > 0 ? [{ name: label, qty: 1, unitPrice: amount }] : [];
    if (lines.length === 0) return NextResponse.json({ error: "Indique une facture ou une vente." }, { status: 400 });
    const invoice = await createWalkInInvoice({
      clientName: typeof body?.clientName === "string" && body.clientName.trim() ? body.clientName.trim() : "Passage caisse",
      clientPhone: typeof body?.clientPhone === "string" ? body.clientPhone : "",
      items: lines,
      note: typeof body?.note === "string" ? body.note : "Vente caisse",
    });
    invoiceId = invoice.id;
  }

  const result = await markInvoicePaid({
    invoiceId,
    method,
    amount: Number(body?.amount) || undefined,
    note: typeof body?.note === "string" ? body.note : undefined,
  });
  if (!result) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  return NextResponse.json(result);
}
