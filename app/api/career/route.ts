import { NextResponse } from "next/server";
import { jobs } from "@/lib/data";
import { bookingsConfigured, createApplication } from "@/lib/store";
import { sendBookingEmail } from "@/lib/notify";
import { sendSms, smsConfigured } from "@/lib/sms";

export const maxDuration = 30;

const MAX_BYTES = 1_200_000;
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function asFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function readFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error("FILE_TOO_BIG");
  const type = file.type || "application/pdf";
  if (!ALLOWED.has(type) && !/\.(pdf|docx?|jpe?g|png)$/i.test(file.name)) throw new Error("FILE_TYPE");
  const bytes = Buffer.from(await file.arrayBuffer());
  return { name: file.name, type, bytes };
}

export async function POST(request: Request) {
  if (!bookingsConfigured()) {
    return NextResponse.json({ error: "Candidatures indisponibles pour le moment." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const jobId = text(form.get("jobId"));
  const job = jobs.find((item) => item.id === jobId);
  const name = text(form.get("name"));
  const phone = text(form.get("phone"));
  const email = text(form.get("email"));
  const letter = text(form.get("letter"));
  const cv = asFile(form.get("cv"));
  const letterFile = asFile(form.get("letterFile"));

  if (!job) return NextResponse.json({ error: "Poste introuvable." }, { status: 404 });
  if (!name || !phone || !email) {
    return NextResponse.json({ error: "Indique ton nom, ton téléphone et ton email." }, { status: 400 });
  }
  if (!letter && !letterFile) {
    return NextResponse.json({ error: "Ajoute une lettre de motivation (texte ou fichier)." }, { status: 400 });
  }
  if (!cv) return NextResponse.json({ error: "Ajoute ton CV (PDF, Word ou image)." }, { status: 400 });

  try {
    const application = await createApplication({
      jobId: job.id,
      jobTitle: job.title,
      name,
      phone,
      email,
      letter,
      cv: await readFile(cv),
      letterFile: letterFile ? await readFile(letterFile) : undefined,
    });
    const owner = process.env.BOOKING_SMS_TO || "";
    const lines = [name, phone, email, job.title, "Voir le CV dans le backoffice · Candidatures"];
    await Promise.allSettled([
      sendBookingEmail({
        subject: `MAC NATION : candidature ${job.title}`,
        title: "Nouvelle candidature",
        lines,
      }),
      smsConfigured() && owner
        ? sendSms(owner, ["MAC NATION : candidature", ...lines].join("\n"))
        : Promise.resolve(),
    ]);
    return NextResponse.json({ ok: true, id: application.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "APPLY";
    if (message === "FILE_TOO_BIG") {
      return NextResponse.json({ error: "Fichier trop lourd. Maximum 1,2 Mo." }, { status: 400 });
    }
    if (message === "FILE_TYPE") {
      return NextResponse.json({ error: "Envoie un PDF, Word, JPG ou PNG." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Impossible d'envoyer la candidature. Réessaie." }, { status: 502 });
  }
}
