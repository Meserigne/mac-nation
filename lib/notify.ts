import { normalizePhone } from "@/lib/sms";

export async function sendWhatsApp(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.WHATSAPP_FROM;
  if (!sid || !token || !from) return false;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${normalizePhone(to)}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      Body: body,
    }),
  });

  if (!res.ok) {
    console.error("WhatsApp failed", res.status, await res.text());
    return false;
  }
  return true;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function emailHtml(title: string, lines: string[]) {
  const rows = lines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#f4f4f5">${escapeHtml(line)}</p>`,
    )
    .join("");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#070708;padding:32px;font-family:Georgia,serif">
    <div style="max-width:480px;margin:0 auto;background:#111113;border:1px solid #c4a57455;padding:28px">
      <p style="margin:0 0 18px;font-size:13px;letter-spacing:0.18em;color:#c4a574">MAC NATION</p>
      <h1 style="margin:0 0 20px;font-size:28px;line-height:1.1;color:#fff">${escapeHtml(title)}</h1>
      ${rows}
    </div>
  </body>
</html>`;
}

async function sendWithResend(to: string[], subject: string, text: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || to.length === 0) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error("Resend failed", res.status, await res.text());
    return false;
  }
  return true;
}

async function sendWithFormSubmit(owner: string, cc: string | undefined, subject: string, fields: Record<string, string>) {
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(owner)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://mac-nation.vercel.app",
      Referer: "https://mac-nation.vercel.app/rendez-vous",
    },
    body: JSON.stringify({
      ...fields,
      _subject: subject,
      _template: "box",
      _captcha: "false",
      ...(cc ? { _cc: cc } : {}),
    }),
  });
  const json = (await res.json().catch(() => null)) as { success?: string | boolean } | null;
  if (!res.ok || json?.success === "false" || json?.success === false) {
    console.error("FormSubmit failed", res.status, json);
    return false;
  }
  return true;
}

export async function sendBookingEmail(options: {
  subject: string;
  title: string;
  lines: string[];
  clientEmail?: string;
}) {
  const owner = process.env.BOOKING_EMAIL_TO;
  if (!owner) return false;
  const text = [options.title, ...options.lines].join("\n");
  const html = emailHtml(options.title, options.lines);
  const recipients = [owner, options.clientEmail].filter((value, index, all): value is string => {
    return Boolean(value) && all.indexOf(value) === index;
  });

  if (await sendWithResend(recipients, options.subject, text, html)) return true;

  const fields: Record<string, string> = {};
  options.lines.forEach((line, index) => {
    fields[`ligne_${index + 1}`] = line;
  });
  fields.message = text;
  return sendWithFormSubmit(owner, options.clientEmail, options.subject, fields);
}
