import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/client-auth";
import { redeemClientPoints } from "@/lib/store";

export async function POST() {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  try {
    const client = await redeemClientPoints(clientId);
    if (!client) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "POINTS_LOW") {
      return NextResponse.json({ error: "Il te faut 10 points pour 1 000 F de crédit salon." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échange impossible." }, { status: 502 });
  }
}
