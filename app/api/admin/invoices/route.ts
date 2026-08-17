import { NextResponse } from "next/server";
import { createWalkInInvoice, invoiceForBooking } from "@/lib/store";
import type { InvoiceLine } from "@/lib/money";

export const dynamic = "force-dynamic";

function asLines(raw: unknown): InvoiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as { name?: unknown; qty?: unknown; unitPrice?: unknown };
      return {
        name: typeof item.name === "string" ? item.name.trim() : "",
        qty: Number(item.qty) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      };
    })
    .filter((line) => line.name && line.qty > 0);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    bookingId?: unknown;
    clientName?: unknown;
    clientPhone?: unknown;
    clientEmail?: unknown;
    items?: unknown;
    note?: unknown;
  } | null;

  if (typeof body?.bookingId === "string" && body.bookingId) {
    const invoice = await invoiceForBooking(body.bookingId);
    if (!invoice) return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    return NextResponse.json({ invoice });
  }

  const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : "";
  const clientPhone = typeof body?.clientPhone === "string" ? body.clientPhone.trim() : "";
  const items = asLines(body?.items);
  if (!clientName || items.length === 0) {
    return NextResponse.json({ error: "Nom et au moins une ligne sont requis." }, { status: 400 });
  }

  const invoice = await createWalkInInvoice({
    clientName,
    clientPhone,
    clientEmail: typeof body?.clientEmail === "string" ? body.clientEmail : "",
    items,
    note: typeof body?.note === "string" ? body.note : "",
  });
  return NextResponse.json({ invoice });
}
