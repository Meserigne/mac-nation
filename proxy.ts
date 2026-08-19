import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/admin-auth";
import { CLIENT_COOKIE, isClientToken } from "@/lib/client-auth";

const COMPTE_PUBLIC = new Set([
  "/compte/login",
  "/api/compte/login",
  "/api/compte/register",
  "/api/compte/session",
  "/api/compte/logout",
  "/api/compte/oauth",
  "/api/compte/oauth/config",
  "/api/compte/pin-reset",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname.startsWith("/compte") || pathname.startsWith("/api/compte")) {
    const clientOk = isClientToken(request.cookies.get(CLIENT_COOKIE)?.value);
    if (COMPTE_PUBLIC.has(pathname)) {
      if (clientOk && pathname === "/compte/login") {
        return NextResponse.redirect(new URL("/compte", request.url));
      }
      return NextResponse.next();
    }
    if (clientOk) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/compte/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/compte", "/compte/:path*", "/api/compte/:path*"],
};
export const proxyConfig = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/compte", "/compte/:path*", "/api/compte/:path*"],
};
