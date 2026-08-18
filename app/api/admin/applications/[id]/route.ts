import { NextResponse } from "next/server";
import { updateApplicationStatus, type ApplicationStatus } from "@/lib/store";

const STATUSES = new Set<ApplicationStatus>(["nouvelle", "vue", "retenue", "refusee"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof body?.status === "string" && STATUSES.has(body.status as ApplicationStatus) ? (body.status as ApplicationStatus) : null;
  if (!status) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  const application = await updateApplicationStatus(id, status);
  if (!application) return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 });
  return NextResponse.json({ application });
}
