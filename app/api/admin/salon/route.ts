import { NextResponse } from "next/server";
import { getSalon } from "@/lib/store";
import { paydunyaConfigured } from "@/lib/paydunya";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const salon = await getSalon();
    return NextResponse.json({ ...salon, paydunyaReady: paydunyaConfigured() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger le backoffice." }, { status: 500 });
  }
}
