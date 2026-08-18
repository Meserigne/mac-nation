import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/client-auth";
import { getClientSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ name: "" });
  try {
    const client = await getClientSession(clientId);
    if (!client) return NextResponse.json({ name: "" });
    return NextResponse.json({ name: client.name, phone: client.phone, email: client.email, id: client.id });
  } catch {
    return NextResponse.json({ name: "" });
  }
}
