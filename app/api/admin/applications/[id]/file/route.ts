import { NextResponse } from "next/server";
import { getApplication, getRepoFile } from "@/lib/store";

export const dynamic = "force-dynamic";

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind") === "lettre" ? "lettre" : "cv";
  const application = await getApplication(id);
  if (!application) return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 });
  const path = kind === "lettre" ? application.letterPath : application.cvPath;
  const filename = kind === "lettre" ? application.letterName : application.cvName;
  if (!path) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  try {
    const bytes = await getRepoFile(path);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeFromName(filename || path),
        "Content-Disposition": `attachment; filename="${(filename || path.split("/").pop() || "fichier").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de télécharger le fichier." }, { status: 502 });
  }
}
