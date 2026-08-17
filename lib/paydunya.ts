import { createHash, timingSafeEqual } from "crypto";
import { siteUrl } from "@/lib/site";
import { attachPaydunya, getInvoice, type Invoice } from "@/lib/store";

type PaydunyaCreateResponse = {
  response_code?: string;
  response_text?: string;
  description?: string;
  token?: string;
};

type PaydunyaConfirmResponse = {
  response_code?: string;
  status?: string;
  hash?: string;
  custom_data?: Record<string, string>;
  invoice?: { token?: string; total_amount?: number | string };
};

export function paydunyaConfigured() {
  return Boolean(process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN);
}

function mode() {
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY || "";
  if (privateKey.startsWith("live_")) return "live";
  if (privateKey.startsWith("test_")) return "test";
  return process.env.PAYDUNYA_MODE === "live" ? "live" : "test";
}

function apiBase() {
  return mode() === "live" ? "https://app.paydunya.com/api/v1" : "https://app.paydunya.com/sandbox-api/v1";
}

function headers() {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY || "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY || "",
    "PAYDUNYA-PUBLIC-KEY": process.env.PAYDUNYA_PUBLIC_KEY || "",
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN || "",
  };
}

export function expectedPaydunyaHash() {
  return createHash("sha512")
    .update(process.env.PAYDUNYA_MASTER_KEY || "")
    .digest("hex");
}

export function paydunyaHashValid(received: string) {
  const expected = expectedPaydunyaHash();
  if (!received || received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return received === expected;
  }
}

export async function createPaydunyaCheckout(invoice: Invoice) {
  if (!paydunyaConfigured()) throw new Error("PAYDUNYA_MISSING");
  if (invoice.amount <= 0) throw new Error("AMOUNT_ZERO");
  if (invoice.status === "payee") throw new Error("ALREADY_PAID");
  if (invoice.status === "annulee") throw new Error("CANCELLED");

  const origin = siteUrl();
  const items: Record<string, { name: string; quantity: number; unit_price: string; total_price: string; description: string }> = {};
  invoice.items.forEach((line, index) => {
    items[`item_${index}`] = {
      name: line.name,
      quantity: line.qty,
      unit_price: String(line.unitPrice),
      total_price: String(line.qty * line.unitPrice),
      description: "",
    };
  });

  const res = await fetch(`${apiBase()}/checkout-invoice/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      invoice: {
        total_amount: invoice.amount,
        description: `MAC NATION ${invoice.number}`,
        items,
        customer: invoice.clientName
          ? {
              name: invoice.clientName,
              ...(invoice.clientEmail ? { email: invoice.clientEmail } : {}),
              phone: invoice.clientPhone.replace(/\D/g, "").slice(-9),
            }
          : undefined,
      },
      store: {
        name: "MAC NATION",
        tagline: "Barbershop Nord Foire, Dakar",
        website_url: origin,
      },
      custom_data: {
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        booking_id: invoice.bookingId || "",
        snapshot: JSON.stringify({
          id: invoice.id,
          number: invoice.number,
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          clientEmail: invoice.clientEmail,
          items: invoice.items,
          amount: invoice.amount,
          kind: invoice.kind || "",
          note: invoice.note || "",
          bookingId: invoice.bookingId || "",
        }),
      },
      actions: {
        callback_url: `${origin}/api/paydunya/ipn`,
        return_url: `${origin}/paiement/retour?invoice=${invoice.id}`,
        cancel_url: `${origin}/paiement/annule?invoice=${invoice.id}`,
      },
    }),
  });

  const json = (await res.json().catch(() => null)) as PaydunyaCreateResponse | null;
  if (!res.ok || json?.response_code !== "00" || !json.token || !json.response_text) {
    console.error("PayDunya create failed", res.status, json);
    throw new Error(json?.response_text || json?.description || `PAYDUNYA_${res.status}`);
  }

  try {
    await attachPaydunya(invoice.id, json.token, json.response_text);
  } catch (error) {
    console.error("Attach PayDunya token failed", error);
  }
  return { token: json.token, url: json.response_text };
}

export async function startCheckout(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("INVOICE_MISSING");
  if (invoice.paydunyaUrl && invoice.paydunyaToken && invoice.status !== "payee") {
    return { token: invoice.paydunyaToken, url: invoice.paydunyaUrl };
  }
  return createPaydunyaCheckout(invoice);
}

export async function confirmPaydunya(token: string) {
  if (!paydunyaConfigured()) throw new Error("PAYDUNYA_MISSING");
  const res = await fetch(`${apiBase()}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
    headers: headers(),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as PaydunyaConfirmResponse | null;
  if (!json) throw new Error(`PAYDUNYA_CONFIRM_${res.status}`);
  return json;
}

export type PaydunyaIpn = {
  hash?: string;
  status?: string;
  token?: string;
  invoice?: { token?: string; total_amount?: number | string };
  custom_data?: Record<string, string>;
};

export function parseIpnPayload(raw: unknown): PaydunyaIpn {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return parseIpnPayload(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  if (o.data && typeof o.data === "object") return parseIpnPayload(o.data);
  return {
    hash: typeof o.hash === "string" ? o.hash : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    token: typeof o.token === "string" ? o.token : undefined,
    invoice: o.invoice as PaydunyaIpn["invoice"],
    custom_data: o.custom_data as PaydunyaIpn["custom_data"],
  };
}
