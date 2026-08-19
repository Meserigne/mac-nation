import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mn_admin";

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function adminToken() {
  return createHmac("sha256", secret()).update("mac-nation-admin").digest("hex");
}

export function isAdminToken(token: string | undefined) {
  const expected = adminToken();
  if (!token || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function envPasswordOk(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export async function passwordOk(password: string) {
  if (!password) return false;
  if (envPasswordOk(password)) return true;
  const { bookingsConfigured, adminPasswordMatches } = await import("@/lib/store");
  if (!bookingsConfigured()) return false;
  try {
    return await adminPasswordMatches(password);
  } catch {
    return false;
  }
}

export function envPasswordEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function requireAdmin() {
  const jar = await cookies();
  return isAdminToken(jar.get(ADMIN_COOKIE)?.value);
}
