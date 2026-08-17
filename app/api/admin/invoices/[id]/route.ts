import { NextResponse } from "next/server";
import { getInvoice, updateInvoice, type InvoiceStatus } from "@/lib/store";
import type { InvoiceLine } from "@/lib/money";

const STATUSES = new Set<InvoiceStatus>(["brouillon", "envoyee", "payee", "annulee"]);

function asLines(raw: unknown): InvoiceLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { items?: unknown; status?: unknown; note?: unknown; amount?: unknown } | null;
  const status = typeof body?.status === "string" && STATUSES.has(body.status as InvoiceStatus) ? (body.status as InvoiceStatus) : undefined;
  const invoice = await updateInvoice(id, {
    items: asLines(body?.items),
    status,
    note: typeof body?.note === "string" ? body.note : undefined,
    amount: typeof body?.amount === "number" || (typeof body?.amount === "string" && body.amount) ? Number(body.amount) : undefined,
  });
  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  return NextResponse.json({ invoice });
}
