import { NextResponse } from "next/server";
import { services } from "@/lib/data";
import { isSnMobile, sendSms, smsConfigured } from "@/lib/sms";
import { sendBookingEmail, sendWhatsApp } from "@/lib/notify";
import { bookingsConfigured, createBooking } from "@/lib/bookings";

type BookingBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  serviceId?: unknown;
  dateLabel?: unknown;
  dateIso?: unknown;
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
  const dateIso = text(payload.dateIso);
  const time = text(payload.time);
  const place = text(payload.place) === "domicile" ? "domicile" : "salon";
  const address = text(payload.address);
  const service = services.find((item) => item.id === serviceId);
  const owner = process.env.BOOKING_SMS_TO || "";

  if (!name || !phone || !service || !dateLabel || !time) {
    return NextResponse.json({ error: "Informations incomplètes." }, { status: 400 });
  }
  if (!isSnMobile(phone)) {
    return NextResponse.json(
      { error: "Indiquez un numéro sénégalais valide (77, 78, 76, 70…)." },
      { status: 400 },
    );
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

  const when = `${dateLabel} à ${time}`;
  const lieu = place === "domicile" ? `Domicile: ${address}` : "Salon Nord Foire";
  const ownerLines = [`${name} · ${phone}`, email || "", when, service.name, lieu].filter(Boolean);
  const clientLines = [name, when, service.name, lieu];
  const ownerMessage = ["MAC NATION : nouveau RDV", ...ownerLines].join("\n");
  const clientMessage = ["MAC NATION : votre RDV", ...clientLines].join("\n");

  let invoiceId = "";
  let amount = 0;
  if (bookingsConfigured()) {
    try {
      const booking = await createBooking({
        name,
        phone,
        email,
        serviceId: service.id,
        serviceName: service.name,
        dateIso: dateIso || dateLabel,
        dateLabel,
        time,
        place,
        address,
      });
      invoiceId = booking.invoiceId || "";
      amount = booking.amount;
    } catch (error) {
      console.error("Booking save failed", error);
      return NextResponse.json({ error: "Impossible d'enregistrer le rendez-vous." }, { status: 500 });
    }
  }

  if (smsConfigured()) {
    try {
      await Promise.all([sendSms(owner, ownerMessage), sendSms(phone, clientMessage)]);
    } catch {
      return NextResponse.json(
        { error: "Le SMS n'a pas pu partir. Vérifiez le numéro et réessayez." },
        { status: 502 },
      );
    }

    await Promise.allSettled([
      sendWhatsApp(owner, dateLabel, `${time} · ${name} · ${service.name}`),
      sendWhatsApp(phone, dateLabel, `${time} · ${service.name} · ${lieu}`),
      sendBookingEmail({
        subject: "MAC NATION : nouveau RDV",
        title: "MAC NATION : nouveau RDV",
        lines: ownerLines,
        clientEmail: email || undefined,
      }),
    ]);
  }

  return NextResponse.json({ ok: true, invoiceId, amount });
}
