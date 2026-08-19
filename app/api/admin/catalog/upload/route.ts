import { NextResponse } from "next/server";
import { putRepoFile } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extOf(name: string, mime: string) {
  const fromName = name.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[0];
  if (fromName) return fromName;
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size < 20) {
    return NextResponse.json({ error: "Ajoute une image." }, { status: 400 });
  }
  if (file.size > 4_000_000) {
    return NextResponse.json({ error: "Image trop lourde (max 4 Mo)." }, { status: 400 });
  }
  const mime = file.type || "";
  if (!/^image\/(jpeg|png|webp)$/.test(mime) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return NextResponse.json({ error: "Image JPG, PNG ou WebP uniquement." }, { status: 400 });
  }
  const ext = extOf(file.name, mime);
  const path = `catalog/${crypto.randomUUID()}${ext}`;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await putRepoFile(path, bytes, `Catalogue image ${file.name}`);
    return NextResponse.json({ url: `/api/catalog/media/${path}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Téléversement impossible." }, { status: 502 });
  }
}
