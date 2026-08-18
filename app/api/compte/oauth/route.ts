import { NextResponse } from "next/server";
import { CLIENT_COOKIE, clientCookieOptions, signClient } from "@/lib/client-auth";
import { verifyOauth } from "@/lib/oauth";
import { bookingsConfigured, loginOrRegisterOAuth } from "@/lib/store";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    credential?: unknown;
    nonce?: unknown;
    name?: unknown;
  } | null;
  const provider = text(body?.provider);
  const credential = text(body?.credential);
  const nonce = text(body?.nonce);
  const name = text(body?.name);

  if (!credential || !["google", "apple", "facebook"].includes(provider)) {
    return NextResponse.json({ error: "Connexion invalide." }, { status: 400 });
  }
  if (!bookingsConfigured()) {
    return NextResponse.json({ error: "Compte indisponible pour le moment." }, { status: 503 });
  }

  try {
    const profile = await verifyOauth({ provider, credential, nonce, name });
    const client = await loginOrRegisterOAuth(profile);
    const res = NextResponse.json({ ok: true, client });
    res.cookies.set(CLIENT_COOKIE, signClient(client.id), clientCookieOptions());
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OAUTH_MISSING") {
      return NextResponse.json({ error: "Cette connexion n'est pas encore activée." }, { status: 503 });
    }
    if (message === "OAUTH_NONCE" || message === "OAUTH_INVALID" || message === "OAUTH_EMAIL") {
      return NextResponse.json({ error: "Connexion refusée. Réessaie." }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Impossible de te connecter avec ce compte." }, { status: 502 });
  }
}
