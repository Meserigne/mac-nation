import { createHash } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { oauthPublicConfig } from "@/lib/device-auth";

export type VerifiedOauth = {
  provider: "google" | "apple" | "facebook";
  providerId: string;
  email: string;
  name: string;
};

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function verifyGoogleIdToken(credential: string, nonce?: string): Promise<VerifiedOauth> {
  const clientId = oauthPublicConfig().google;
  if (!clientId) throw new Error("OAUTH_MISSING");
  const { payload } = await jwtVerify(credential, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (nonce && payload.nonce && payload.nonce !== nonce) throw new Error("OAUTH_NONCE");
  const email = text(payload.email);
  if (payload.email_verified !== true || !email) throw new Error("OAUTH_EMAIL");
  const name = text(payload.name) || email.split("@")[0];
  return { provider: "google", providerId: String(payload.sub), email, name };
}

export async function verifyAppleIdToken(credential: string, nonce?: string): Promise<VerifiedOauth> {
  const clientId = oauthPublicConfig().apple;
  if (!clientId) throw new Error("OAUTH_MISSING");
  const { payload } = await jwtVerify(credential, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: clientId,
  });
  if (nonce) {
    const expected = sha256(nonce);
    if (text(payload.nonce) && text(payload.nonce) !== expected && text(payload.nonce) !== nonce) {
      throw new Error("OAUTH_NONCE");
    }
  }
  const email = text(payload.email);
  const name = email ? email.split("@")[0] : "Client MAC NATION";
  return { provider: "apple", providerId: String(payload.sub), email, name };
}

export async function verifyFacebookToken(accessToken: string): Promise<VerifiedOauth> {
  const appId = oauthPublicConfig().facebook;
  const secret = process.env.FACEBOOK_APP_SECRET || "";
  if (!appId || !secret) throw new Error("OAUTH_MISSING");
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", `${appId}|${secret}`);
  const debugRes = await fetch(debugUrl, { cache: "no-store" });
  const debug = (await debugRes.json()) as { data?: { app_id?: string; is_valid?: boolean; user_id?: string } };
  if (!debug.data?.is_valid || debug.data.app_id !== appId) throw new Error("OAUTH_INVALID");
  const meRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
    { cache: "no-store" },
  );
  const me = (await meRes.json()) as { id?: string; name?: string; email?: string };
  if (!me.id) throw new Error("OAUTH_INVALID");
  return {
    provider: "facebook",
    providerId: me.id,
    email: text(me.email),
    name: text(me.name) || "Client MAC NATION",
  };
}

export async function verifyOauth(input: {
  provider: string;
  credential: string;
  nonce?: string;
  name?: string;
}): Promise<VerifiedOauth> {
  if (input.provider === "google") return verifyGoogleIdToken(input.credential, input.nonce);
  if (input.provider === "apple") {
    const verified = await verifyAppleIdToken(input.credential, input.nonce);
    if (input.name?.trim()) verified.name = input.name.trim();
    return verified;
  }
  if (input.provider === "facebook") return verifyFacebookToken(input.credential);
  throw new Error("OAUTH_PROVIDER");
}
