import { NextResponse } from "next/server";
import { oauthPublicConfig } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = oauthPublicConfig();
  return NextResponse.json({
    google: config.google,
    apple: config.apple,
    facebook: config.facebook,
    siteUrl: config.siteUrl,
  });
}
