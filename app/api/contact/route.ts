import { NextResponse } from "next/server";
import { bookingsConfigured, createContactMessage } from "@/lib/store";
import { sendBookingEmail } from "@/lib/notify";
import { isSnMobile, sendSms, smsConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

const SUBJECTS: Record<string, string> = {
  reservation: "Réservation",
  domicile: "Coiffure à domicile",
  abonnement: "Abonnement",
  boutique: "Boutique",
  recrutement: "Recrutement",
  autre: "Message",
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    subject?: unknown;
    message?: unknown;
  } | null;
  const name = text(body?.name);
  const email = text(body?.email);
  const phone = text(body?.phone);
  const subjectKey = text(body?.subject) || "autre";
  const subject = SUBJECTS[subjectKey] || SUBJECTS.autre;
  const message = text(body?.message);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Indique ton nom, ton email et ton message." }, { status: 400 });
  }
  if (phone && !isSnMobile(phone)) {
    return NextResponse.json({ error: "Indique un numéro sénégalais valide (77, 78, 76, 70…)." }, { status: 400 });
  }

  try {
    if (bookingsConfigured()) {
      await createContactMessage({ name, email, phone, subject, message });
    }
    const owner = process.env.BOOKING_SMS_TO || "";
    const lines = [name, phone || "Sans téléphone", email, subject, message];
    await Promise.allSettled([
      sendBookingEmail({
        subject: `MAC NATION : ${subject}`,
        title: "Nouveau message",
        lines,
      }),
      smsConfigured() && owner ? sendSms(owner, ["MAC NATION : message", name, subject].join("\n")) : Promise.resolve(),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'envoyer le message. Réessaie." }, { status: 502 });
  }
}
