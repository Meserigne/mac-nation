import { NextResponse } from "next/server";
import { updateBookingStatus, type BookingStatus } from "@/lib/bookings";

const STATUSES = new Set<BookingStatus>(["nouveau", "confirme", "termine", "annule"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status;
  if (typeof status !== "string" || !STATUSES.has(status as BookingStatus)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const booking = await updateBookingStatus(id, status as BookingStatus);
  if (!booking) return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  return NextResponse.json({ booking });
}
