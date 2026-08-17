import { NextResponse } from "next/server";
import { confirmPaydunya, parseIpnPayload, paydunyaHashValid } from "@/lib/paydunya";
import { markInvoicePaid, type Invoice } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let payload: unknown;
  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      const data = form.get("data");
      payload = typeof data === "string" ? data : Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "IPN invalide." }, { status: 400 });
  }

  const ipn = parseIpnPayload(payload);
  if (!ipn.hash || !paydunyaHashValid(ipn.hash)) {
    return NextResponse.json({ error: "Hash invalide." }, { status: 401 });
  }

  const token = ipn.invoice?.token || ipn.token || "";
  const invoiceId = ipn.custom_data?.invoice_id;
  const status = (ipn.status || "").toLowerCase();
  let snapshot: Partial<Invoice> | undefined;
  if (ipn.custom_data?.snapshot) {
    try {
      snapshot = JSON.parse(ipn.custom_data.snapshot) as Partial<Invoice>;
    } catch {
      snapshot = undefined;
    }
  }

  if (token) {
    try {
      const confirmed = await confirmPaydunya(token);
      const confirmedStatus = (confirmed.status || status).toLowerCase();
      if (confirmedStatus === "completed") {
        await markInvoicePaid({
          invoiceId,
          paydunyaToken: token,
          method: "paydunya",
          snapshot,
        });
      }
    } catch (error) {
      console.error("PayDunya confirm", error);
      if (status === "completed") {
        await markInvoicePaid({ invoiceId, paydunyaToken: token, method: "paydunya", snapshot });
      }
    }
  } else if (status === "completed" && invoiceId) {
    await markInvoicePaid({ invoiceId, method: "paydunya", snapshot });
  }

  return NextResponse.json({ ok: true });
}
