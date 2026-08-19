import { NextResponse } from "next/server";
import { getRepoFile } from "@/lib/store";

export const dynamic = "force-dynamic";

function mimeFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const rel = path.map((part) => decodeURIComponent(part)).join("/");
  if (!rel.startsWith("catalog/") || rel.includes("..")) {
    return NextResponse.json({ error: "Fichier interdit." }, { status: 400 });
  }
  try {
    const bytes = await getRepoFile(rel);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeFromPath(rel),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }
}
