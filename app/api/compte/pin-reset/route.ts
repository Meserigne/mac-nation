import { NextResponse } from "next/server";
import { isSnMobile, sendSms, smsConfigured } from "@/lib/sms";
import { bookingsConfigured, peekClientForPinReset, resetClientPin } from "@/lib/store";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function newPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = text(body?.phone);
  const ok = { ok: true, message: "Si ce numéro a un compte, un nouveau PIN part par SMS." };

  if (!isSnMobile(phone)) {
    return NextResponse.json({ error: "Indique un numéro sénégalais valide (77, 78, 76, 70…)." }, { status: 400 });
  }
  if (!bookingsConfigured()) return NextResponse.json(ok);
  if (!smsConfigured()) {
    return NextResponse.json({ error: "SMS indisponible pour le moment. Passe au salon." }, { status: 503 });
  }

  try {
    const client = await peekClientForPinReset(phone);
    if (!client) return NextResponse.json(ok);
    const last = client.lastPinResetAt ? Date.parse(client.lastPinResetAt) : 0;
    if (last && Date.now() - last < 10 * 60 * 1000) return NextResponse.json(ok);
    const pin = newPin();
    await sendSms(client.phone, `MAC NATION : ton nouveau PIN est ${pin}. Change-le dans ton compte.`);
    await resetClientPin(client.id, pin);
    return NextResponse.json(ok);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'envoyer le PIN. Réessaie." }, { status: 502 });
  }
}
