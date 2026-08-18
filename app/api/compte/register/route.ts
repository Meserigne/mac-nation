import { NextResponse } from "next/server";
import { CLIENT_COOKIE, clientCookieOptions, isPin, signClient } from "@/lib/client-auth";
import { isSnMobile } from "@/lib/sms";
import { bookingsConfigured, registerClient } from "@/lib/store";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    pin?: unknown;
  } | null;
  const name = text(body?.name);
  const phone = text(body?.phone);
  const email = text(body?.email);
  const pin = text(body?.pin);

  if (!name || !phone) {
    return NextResponse.json({ error: "Indique ton nom et ton téléphone." }, { status: 400 });
  }
  if (!isSnMobile(phone)) {
    return NextResponse.json({ error: "Indique un numéro sénégalais valide (77, 78, 76, 70…)." }, { status: 400 });
  }
  if (!isPin(pin)) {
    return NextResponse.json({ error: "Le code PIN doit contenir 4 à 6 chiffres." }, { status: 400 });
  }
  if (!bookingsConfigured()) {
    return NextResponse.json({ error: "Compte indisponible pour le moment." }, { status: 503 });
  }

  try {
    const client = await registerClient({ name, phone, email, pin });
    const res = NextResponse.json({ ok: true, client });
    res.cookies.set(CLIENT_COOKIE, signClient(client.id), clientCookieOptions());
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PHONE_TAKEN") {
      return NextResponse.json({ error: "Ce numéro a déjà un compte. Connecte-toi." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer le compte." }, { status: 502 });
  }
}
