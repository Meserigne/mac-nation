import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/client-auth";
import { cancelClientMembership } from "@/lib/store";

export async function DELETE() {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  try {
    const membership = await cancelClientMembership(clientId);
    if (!membership) return NextResponse.json({ error: "Aucun abonnement actif." }, { status: 404 });
    return NextResponse.json({ ok: true, membership });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'arrêter l'abonnement." }, { status: 502 });
  }
}
