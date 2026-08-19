import { NextResponse } from "next/server";
import { asCatalog } from "@/lib/catalog";
import { getAdminCatalog, saveCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger le catalogue." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  try {
    const catalog = await saveCatalog(asCatalog(body));
    return NextResponse.json({ ok: true, catalog });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
