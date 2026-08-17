import { NextResponse } from "next/server";
import { refreshInvoicePayment, type SoftPayMethod } from "@/lib/paydunya";

export const dynamic = "force-dynamic";

const METHODS = new Set<SoftPayMethod>(["wave", "orange", "free"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const invoiceId = url.searchParams.get("invoice") || "";
  const methodRaw = url.searchParams.get("method") || "";
  const method = METHODS.has(methodRaw as SoftPayMethod) ? (methodRaw as SoftPayMethod) : undefined;
  if (!invoiceId) return NextResponse.json({ error: "Facture manquante." }, { status: 400 });

  try {
    const invoice = await refreshInvoicePayment(invoiceId, method);
    return NextResponse.json({
      status: invoice.status,
      paid: invoice.status === "payee",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STATUS";
    if (message === "INVOICE_MISSING") return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    console.error(error);
    return NextResponse.json({ paid: false, status: "envoyee" });
  }
}
