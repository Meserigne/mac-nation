import { NextResponse } from "next/server";
import { services } from "@/lib/data";
import { sendSms, smsConfigured } from "@/lib/sms";

type BookingBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  serviceId?: unknown;
  dateLabel?: unknown;
  time?: unknown;
  place?: unknown;
  address?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: BookingBody;
  try {
    payload = (await request.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = text(payload.name);
  const phone = text(payload.phone);
  const email = text(payload.email);
  const serviceId = text(payload.serviceId);
  const dateLabel = text(payload.dateLabel);
  const time = text(payload.time);
  const place = text(payload.place) === "domicile" ? "domicile" : "salon";
  const address = text(payload.address);
  const service = services.find((item) => item.id === serviceId);

  if (!name || !phone || !service || !dateLabel || !time) {
    return NextResponse.json({ error: "Informations incomplètes." }, { status: 400 });
  }
  if (place === "domicile" && !address) {
    return NextResponse.json({ error: "Adresse requise pour un rendez-vous à domicile." }, { status: 400 });
  }
  if (!smsConfigured()) {
    console.error("SMS env vars missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, BOOKING_SMS_TO");
    return NextResponse.json(
      { error: "La notification SMS n'est pas encore configurée. Réessayez plus tard." },
      { status: 503 },
    );
  }

  const lieu = place === "domicile" ? `Domicile: ${address}` : "Salon Nord Foire";
  const message = [
    "MAC NATION — nouveau RDV",
    `${name} · ${phone}`,
    email ? email : null,
    `${dateLabel} à ${time}`,
    service.name,
    lieu,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendSms(message);
  } catch {
    return NextResponse.json(
      { error: "Le SMS n'a pas pu partir. Réessayez dans un instant." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
