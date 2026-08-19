import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getPublicCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Catalogue indisponible." }, { status: 502 });
  }
}
