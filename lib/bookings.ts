import { createClient, type RedisClientType } from "redis";

export type BookingStatus = "nouveau" | "confirme" | "termine" | "annule";

export type Booking = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  serviceName: string;
  dateIso: string;
  dateLabel: string;
  time: string;
  place: "salon" | "domicile";
  address: string;
  status: BookingStatus;
};

const INDEX = "mn:bookings";
let client: RedisClientType | null = null;

function scoreOf(booking: Pick<Booking, "dateIso" | "time">) {
  const stamp = `${booking.dateIso.replaceAll("-", "")}${booking.time.replace(":", "")}`;
  return Number(stamp) || Date.now();
}

export function bookingsConfigured() {
  if (process.env.REDIS_URL) return true;
  return Boolean(process.env.BOOKINGS_GIST_ID && process.env.BOOKINGS_GITHUB_TOKEN);
}

async function redis() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_MISSING");
  if (!client) {
    client = createClient({ url });
    client.on("error", (error) => console.error("Redis", error));
  }
  if (!client.isOpen) await client.connect();
  return client;
}

async function gistHeaders() {
  return {
    Authorization: `Bearer ${process.env.BOOKINGS_GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function loadFromGist() {
  const id = process.env.BOOKINGS_GIST_ID;
  if (!id) throw new Error("GIST_MISSING");
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    headers: await gistHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GIST_LOAD_${res.status}`);
  const gist = (await res.json()) as { files?: Record<string, { content?: string }> };
  const raw = gist.files?.["bookings.json"]?.content || "[]";
  return JSON.parse(raw) as Booking[];
}

async function saveToGist(bookings: Booking[]) {
  const id = process.env.BOOKINGS_GIST_ID;
  if (!id) throw new Error("GIST_MISSING");
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    method: "PATCH",
    headers: { ...(await gistHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({
      files: { "bookings.json": { content: JSON.stringify(bookings, null, 2) } },
    }),
  });
  if (!res.ok) throw new Error(`GIST_SAVE_${res.status}`);
}

export async function createBooking(input: Omit<Booking, "id" | "createdAt" | "status">) {
  const booking: Booking = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "nouveau",
  };

  if (process.env.REDIS_URL) {
    const db = await redis();
    await db
      .multi()
      .set(`mn:booking:${booking.id}`, JSON.stringify(booking))
      .zAdd(INDEX, { score: scoreOf(booking), value: booking.id })
      .exec();
    return booking;
  }

  const bookings = await loadFromGist();
  bookings.push(booking);
  await saveToGist(bookings);
  return booking;
}

export async function listBookings() {
  if (process.env.REDIS_URL) {
    const db = await redis();
    const ids = await db.zRange(INDEX, 0, -1);
    if (ids.length === 0) return [] as Booking[];
    const rows = await db.mGet(ids.map((id) => `mn:booking:${id}`));
    return rows
      .map((row) => {
        if (!row) return null;
        try {
          return JSON.parse(row) as Booking;
        } catch {
          return null;
        }
      })
      .filter((row): row is Booking => Boolean(row))
      .sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt));
  }

  return (await loadFromGist()).sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt));
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  if (process.env.REDIS_URL) {
    const db = await redis();
    const raw = await db.get(`mn:booking:${id}`);
    if (!raw) return null;
    const booking = JSON.parse(raw) as Booking;
    booking.status = status;
    await db.set(`mn:booking:${id}`, JSON.stringify(booking));
    return booking;
  }

  const bookings = await loadFromGist();
  const booking = bookings.find((item) => item.id === id);
  if (!booking) return null;
  booking.status = status;
  await saveToGist(bookings);
  return booking;
}
