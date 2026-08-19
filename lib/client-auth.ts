import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const CLIENT_COOKIE = "mn_client";

function secret() {
  return process.env.CLIENT_SECRET || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "mac-nation-client";
}

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(value, salt, 12000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function secretOk(value: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = pbkdf2Sync(value, salt, 12000, 32, "sha256").toString("hex");
  if (check.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(check), Buffer.from(hash));
}

export const hashPin = hashSecret;
export const pinOk = secretOk;

export function isPin(value: string) {
  return /^\d{4,6}$/.test(value);
}

export function isAdminPassword(value: string) {
  return value.length >= 8 && value.length <= 72;
}

export function signClient(clientId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = `${clientId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function readClientToken(token: string | undefined) {
  if (!token) return "";
  const parts = token.split(".");
  if (parts.length !== 3) return "";
  const [clientId, expRaw, sig] = parts;
  const payload = `${clientId}.${expRaw}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  if (expected.length !== sig.length) return "";
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return "";
  if (Number(expRaw) < Date.now()) return "";
  return clientId;
}

export function isClientToken(token: string | undefined) {
  return Boolean(readClientToken(token));
}

export async function getSessionClientId() {
  const jar = await cookies();
  return readClientToken(jar.get(CLIENT_COOKIE)?.value);
}

export function clientCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
