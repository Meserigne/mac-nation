import { NextResponse } from "next/server";
import { listBookings } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bookings = await listBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger les rendez-vous." }, { status: 500 });
  }
}
