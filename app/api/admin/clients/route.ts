import { NextResponse } from "next/server";
import { isPin } from "@/lib/client-auth";
import { isSnMobile } from "@/lib/sms";
import { registerClient } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    pin?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!name || !phone) {
    return NextResponse.json({ error: "Indique le nom et le téléphone." }, { status: 400 });
  }
  if (!isSnMobile(phone)) {
    return NextResponse.json({ error: "Numéro sénégalais invalide." }, { status: 400 });
  }
  if (!isPin(pin)) {
    return NextResponse.json({ error: "Le PIN doit contenir 4 à 6 chiffres." }, { status: 400 });
  }
  try {
    const client = await registerClient({ name, phone, email, pin });
    return NextResponse.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PHONE_TAKEN") {
      return NextResponse.json({ error: "Ce numéro a déjà un compte." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Création impossible." }, { status: 502 });
  }
}
