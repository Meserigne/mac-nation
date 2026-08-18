import { NextResponse } from "next/server";
import { CLIENT_COOKIE, clientCookieOptions, isPin, signClient } from "@/lib/client-auth";
import { isSnMobile } from "@/lib/sms";
import { bookingsConfigured, loginClient } from "@/lib/store";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; pin?: unknown } | null;
  const phone = text(body?.phone);
  const pin = text(body?.pin);

  if (!isSnMobile(phone) || !isPin(pin)) {
    return NextResponse.json({ error: "Téléphone ou code PIN incorrect." }, { status: 400 });
  }
  if (!bookingsConfigured()) {
    return NextResponse.json({ error: "Compte indisponible pour le moment." }, { status: 503 });
  }

  try {
    const client = await loginClient(phone, pin);
    if (!client) {
      return NextResponse.json({ error: "Téléphone ou code PIN incorrect." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, client });
    res.cookies.set(CLIENT_COOKIE, signClient(client.id), clientCookieOptions());
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Connexion impossible." }, { status: 502 });
  }
}
