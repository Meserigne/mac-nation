import { createHash, timingSafeEqual } from "crypto";
import { siteUrl } from "@/lib/site";
import { isSnMobile, normalizePhone } from "@/lib/sms";
import { attachPaydunya, getInvoice, markInvoicePaid, type Invoice } from "@/lib/store";
import type { PaymentMethod } from "@/lib/money";

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
  return "live";
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

export async function createPaydunyaCheckout(invoice: Invoice, opts?: { channels?: string[] }) {
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
        ...(opts?.channels?.length ? { channels: opts.channels } : {}),
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

export type SoftPayMethod = "wave" | "orange" | "free";

type SoftPayApiResponse = {
  success?: boolean;
  message?: string;
  url?: string;
  other_url?: { om_url?: string; maxit_url?: string };
  errors?: { message?: string; description?: string };
};

export type SoftPayResult = {
  method: SoftPayMethod;
  message: string;
  url?: string;
  qr?: string;
  omUrl?: string;
  maxitUrl?: string;
};

const SOFTPAY_CHANNELS: Record<SoftPayMethod, string> = {
  wave: "wave-senegal",
  orange: "orange-money-senegal",
  free: "free-money-senegal",
};

function localSnPhone(phone: string) {
  return normalizePhone(phone).replace(/\D/g, "").slice(-9);
}

function payerEmail(email: string, phone: string) {
  const trimmed = email.trim();
  if (trimmed.includes("@")) return trimmed;
  return `${localSnPhone(phone)}@client.mac-nation.sn`;
}

function softPayError(json: SoftPayApiResponse | null) {
  return json?.errors?.description || json?.errors?.message || json?.message || "Paiement Mobile Money indisponible.";
}

function orangeQrFromUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("data:image/")) return url;
  try {
    const parsed = new URL(url);
    const qr = parsed.searchParams.get("data[qrcode]");
    if (qr) return `data:image/png;base64,${qr.replace(/ /g, "+")}`;
  } catch {
    return "";
  }
  return "";
}

function operatorMessage(method: SoftPayMethod) {
  if (method === "wave") return "Ouvre Wave pour valider. MAC NATION reste ouvert.";
  if (method === "orange") return "Ouvre Max it pour valider. MAC NATION reste ouvert.";
  return "Ouvre Mixx by Free et compose #150# si demandé. MAC NATION reste ouvert.";
}

async function postSoftPay(path: string, body: Record<string, string>) {
  const res = await fetch(`https://app.paydunya.com/api/v1${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as SoftPayApiResponse | null;
  if (res.status === 404 || !json) {
    throw new Error("SOFTPAY_UNAVAILABLE");
  }
  if (!res.ok || json.success === false) {
    console.error("PayDunya SoftPay failed", path, res.status, json);
    throw new Error(softPayError(json));
  }
  return json;
}

async function requestOperatorSoftPay(
  method: SoftPayMethod,
  token: string,
  name: string,
  email: string,
  phone: string,
): Promise<SoftPayResult> {
  if (method === "wave") {
    const json = await postSoftPay("/softpay/wave-senegal", {
      wave_senegal_fullName: name,
      wave_senegal_email: email,
      wave_senegal_phone: phone,
      wave_senegal_payment_token: token,
    });
    if (!json.url) throw new Error(json.message || "Wave n'a pas renvoyé de lien de paiement.");
    return { method, url: json.url, message: json.message || operatorMessage(method) };
  }

  if (method === "orange") {
    const json = await postSoftPay("/softpay/new-orange-money-senegal", {
      customer_name: name,
      customer_email: email,
      phone_number: phone,
      invoice_token: token,
    });
    const qr = orangeQrFromUrl(json.url || "");
    const omUrl = json.other_url?.om_url || "";
    const maxitUrl = json.other_url?.maxit_url || "";
    if (!qr && !omUrl && !maxitUrl && !json.url) {
      throw new Error(json.message || "Max it n'a pas renvoyé de QR code.");
    }
    return {
      method,
      qr,
      omUrl,
      maxitUrl,
      url: omUrl || json.url,
      message: json.message || "Scanne le QR avec Max it, ou ouvre l’application.",
    };
  }

  const json = await postSoftPay("/softpay/free-money-senegal", {
    customer_name: name,
    customer_email: email,
    phone_number: phone,
    payment_token: token,
  });
  return {
    method,
    url: json.url,
    message: json.message || operatorMessage(method),
  };
}

export async function startSoftPay(opts: {
  invoiceId: string;
  method: SoftPayMethod;
  phone?: string;
  name?: string;
  email?: string;
}): Promise<SoftPayResult> {
  const invoice = await getInvoice(opts.invoiceId);
  if (!invoice) throw new Error("INVOICE_MISSING");
  const phone = localSnPhone(opts.phone || invoice.clientPhone);
  if (!isSnMobile(phone)) throw new Error("PHONE_INVALID");
  const name = (opts.name || invoice.clientName || "Client MAC NATION").trim();
  const email = payerEmail(opts.email || invoice.clientEmail, phone);

  try {
    const checkout = await startCheckout(opts.invoiceId);
    return await requestOperatorSoftPay(opts.method, checkout.token, name, email, phone);
  } catch (error) {
    console.error("PayDunya SoftPay failed, using operator checkout", error);
  }

  const checkout = await createPaydunyaCheckout(invoice, { channels: [SOFTPAY_CHANNELS[opts.method]] });
  return { method: opts.method, url: checkout.url, message: operatorMessage(opts.method) };
}

export async function refreshInvoicePayment(invoiceId: string, method?: SoftPayMethod) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("INVOICE_MISSING");
  if (invoice.status === "payee") return invoice;
  const token = invoice.paydunyaToken;
  if (!token) return invoice;
  const confirmed = await confirmPaydunya(token);
  if ((confirmed.status || "").toLowerCase() !== "completed") return invoice;
  const paidMethod: PaymentMethod = method || "paydunya";
  const result = await markInvoicePaid({
    invoiceId: invoice.id,
    paydunyaToken: token,
    method: paidMethod,
  });
  return result?.invoice || invoice;
}

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
