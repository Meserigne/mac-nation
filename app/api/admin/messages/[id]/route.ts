import { NextResponse } from "next/server";
import { updateContactMessage, type ContactStatus } from "@/lib/store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status;
  if (status !== "nouveau" && status !== "lu" && status !== "traite") {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  try {
    const message = await updateContactMessage(id, status as ContactStatus);
    if (!message) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    return NextResponse.json({ message });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 502 });
  }
}
