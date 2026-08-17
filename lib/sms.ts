export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+221${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `+221${digits}`;
  if (input.trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function isSnMobile(input: string) {
  const phone = normalizePhone(input);
  return /^\+2217\d{8}$/.test(phone);
}

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM &&
      process.env.BOOKING_SMS_TO,
  );
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: normalizePhone(to),
      From: from,
      Body: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Twilio SMS failed", res.status, detail);
    throw new Error("SMS_SEND_FAILED");
  }
}
