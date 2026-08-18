import { NextResponse } from "next/server";
import { getSessionClientId, isPin } from "@/lib/client-auth";
import { updateClientProfile } from "@/lib/store";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown; pin?: unknown } | null;
  const name = text(body?.name);
  const email = text(body?.email);
  const pin = text(body?.pin);
  if (pin && !isPin(pin)) {
    return NextResponse.json({ error: "Le code PIN doit contenir 4 à 6 chiffres." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Indique ton nom." }, { status: 400 });
  }
  try {
    const client = await updateClientProfile(clientId, { name, email, pin: pin || undefined });
    if (!client) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'enregistrer le profil." }, { status: 502 });
  }
}
