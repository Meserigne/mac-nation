import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/client-auth";
import { getClientDashboard } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  try {
    const dashboard = await getClientDashboard(clientId);
    if (!dashboard) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger ton espace." }, { status: 502 });
  }
}
