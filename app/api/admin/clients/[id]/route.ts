import { NextResponse } from "next/server";
import { isPin } from "@/lib/client-auth";
import { adjustClient, resetClientPin } from "@/lib/store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    pointsDelta?: unknown;
    creditDelta?: unknown;
    note?: unknown;
    pin?: unknown;
  } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  const pointsDelta = Number(body?.pointsDelta) || 0;
  const creditDelta = Number(body?.creditDelta) || 0;
  const note = typeof body?.note === "string" ? body.note : "";

  try {
    if (pin) {
      if (!isPin(pin)) {
        return NextResponse.json({ error: "Le code PIN doit contenir 4 à 6 chiffres." }, { status: 400 });
      }
      const client = await resetClientPin(id, pin);
      if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
      return NextResponse.json({ client });
    }
    if (!pointsDelta && !creditDelta) {
      return NextResponse.json({ error: "Aucun ajustement." }, { status: 400 });
    }
    const client = await adjustClient(id, { pointsDelta, creditDelta, note });
    if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    return NextResponse.json({ client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ajustement impossible." }, { status: 502 });
  }
}
