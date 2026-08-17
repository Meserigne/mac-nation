import { NextResponse } from "next/server";
import { plans, products } from "@/lib/data";
import { parseFcfa } from "@/lib/money";
import { isSnMobile, sendSms, smsConfigured } from "@/lib/sms";
import { sendBookingEmail } from "@/lib/notify";
import { bookingsConfigured, createWalkInInvoice } from "@/lib/store";
import { startCheckout } from "@/lib/paydunya";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    itemId?: unknown;
    qty?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
  } | null;

  const kind = text(body?.kind);
  const itemId = text(body?.itemId);
  const name = text(body?.name);
  const phone = text(body?.phone);
  const email = text(body?.email);
  const qty = Math.min(10, Math.max(1, Number(body?.qty) || 1));

  if (!name || !phone) {
    return NextResponse.json({ error: "Indiquez votre nom et votre téléphone." }, { status: 400 });
  }
  if (!isSnMobile(phone)) {
    return NextResponse.json({ error: "Indiquez un numéro sénégalais valide (77, 78, 76, 70…)." }, { status: 400 });
  }
  if (!bookingsConfigured()) {
    return NextResponse.json({ error: "Paiement indisponible pour le moment." }, { status: 503 });
  }

  let lineName = "";
  let unitPrice = 0;
  let invoiceKind: "boutique" | "abonnement" = "boutique";
  let note = "";

  if (kind === "boutique") {
    const product = products.find((item) => item.id === itemId);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    lineName = product.name;
    unitPrice = parseFcfa(product.price);
    note = `Boutique · retrait au salon Nord Foire`;
  } else if (kind === "abonnement") {
    const plan = plans.find((item) => item.id === itemId);
    if (!plan) return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    lineName = `Abonnement ${plan.name} · ${plan.period}`;
    unitPrice = parseFcfa(plan.price);
    invoiceKind = "abonnement";
    note = `Abonnement ${plan.name} · 1 mois`;
  } else {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  if (unitPrice <= 0) {
    return NextResponse.json({ error: "Montant à confirmer au salon." }, { status: 400 });
  }

  try {
    const invoice = await createWalkInInvoice({
      clientName: name,
      clientPhone: phone,
      clientEmail: email,
      items: [{ name: lineName, qty: invoiceKind === "abonnement" ? 1 : qty, unitPrice }],
      note,
      kind: invoiceKind,
    });
    const checkout = await startCheckout(invoice.id);
    const owner = process.env.BOOKING_SMS_TO || "";
    const lines = [name, phone, email, `${lineName}${qty > 1 && invoiceKind === "boutique" ? ` × ${qty}` : ""}`, `${invoice.amount} F`, note].filter(Boolean);
    if (smsConfigured() && owner) {
      await Promise.allSettled([
        sendSms(owner, ["MAC NATION : paiement", ...lines].join("\n")),
        sendBookingEmail({
          subject: `MAC NATION : ${invoiceKind === "boutique" ? "commande boutique" : "abonnement"}`,
          title: invoiceKind === "boutique" ? "Commande boutique" : "Nouvel abonnement",
          lines,
          clientEmail: email || undefined,
        }),
      ]);
    }
    return NextResponse.json({ ok: true, url: checkout.url, invoiceId: invoice.id, amount: invoice.amount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PAYDUNYA";
    if (message === "PAYDUNYA_MISSING") {
      return NextResponse.json({ error: "Paiement Mobile Money indisponible pour le moment." }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: "Impossible d'ouvrir le paiement." }, { status: 502 });
  }
}
