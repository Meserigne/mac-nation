import { NextResponse } from "next/server";
import { envPasswordEnabled } from "@/lib/admin-auth";
import { isAdminPassword } from "@/lib/client-auth";
import { createAdmin, deleteAdmin, listAdmins, updateAdmin } from "@/lib/store";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const admins = await listAdmins();
    return NextResponse.json({
      admins,
      envFallback: envPasswordEnabled(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger les accès." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    id?: unknown;
    name?: unknown;
    password?: unknown;
  } | null;
  const action = text(body?.action);
  const id = text(body?.id);
  const name = text(body?.name);
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    if (action === "create") {
      if (!name) return NextResponse.json({ error: "Indique un nom." }, { status: 400 });
      if (!isAdminPassword(password)) {
        return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });
      }
      const admin = await createAdmin(name, password);
      return NextResponse.json({ ok: true, admin });
    }

    if (action === "update") {
      if (!id) return NextResponse.json({ error: "Compte introuvable." }, { status: 400 });
      if (password && !isAdminPassword(password)) {
        return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });
      }
      if (!name && !password) {
        return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
      }
      const admin = await updateAdmin(id, { name: name || undefined, password: password || undefined });
      if (!admin) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
      return NextResponse.json({ ok: true, admin });
    }

    if (action === "delete") {
      if (!id) return NextResponse.json({ error: "Compte introuvable." }, { status: 400 });
      const ok = await deleteAdmin(id);
      if (!ok) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
