import { NextResponse } from "next/server";
import { adjustClient } from "@/lib/store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    pointsDelta?: unknown;
    creditDelta?: unknown;
    note?: unknown;
  } | null;
  const pointsDelta = Number(body?.pointsDelta) || 0;
  const creditDelta = Number(body?.creditDelta) || 0;
  const note = typeof body?.note === "string" ? body.note : "";
  if (!pointsDelta && !creditDelta) {
    return NextResponse.json({ error: "Aucun ajustement." }, { status: 400 });
  }
  try {
    const client = await adjustClient(id, { pointsDelta, creditDelta, note });
    if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    return NextResponse.json({ client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ajustement impossible." }, { status: 502 });
  }
}
