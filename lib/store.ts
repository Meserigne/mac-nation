import { createClient, type RedisClientType } from "redis";
import { bookingAmount, bookingLines, invoiceTotal, type ExpenseCategory, type InvoiceLine, type PaymentMethod } from "@/lib/money";

export type BookingStatus = "nouveau" | "confirme" | "termine" | "annule";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type InvoiceStatus = "brouillon" | "envoyee" | "payee" | "annulee";
export type InvoiceKind = "rdv" | "boutique" | "abonnement" | "caisse";

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
  amount: number;
  paymentStatus: PaymentStatus;
  invoiceId?: string;
};

export type Invoice = {
  id: string;
  number: string;
  createdAt: string;
  paidAt?: string;
  bookingId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  items: InvoiceLine[];
  amount: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paydunyaToken?: string;
  paydunyaUrl?: string;
  note?: string;
  kind?: InvoiceKind;
};

export type Payment = {
  id: string;
  createdAt: string;
  invoiceId?: string;
  bookingId?: string;
  amount: number;
  method: PaymentMethod;
  status: "pending" | "completed" | "failed";
  note?: string;
  paydunyaToken?: string;
};

export type Expense = {
  id: string;
  createdAt: string;
  dateIso: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
};

export type SalonStore = {
  bookings: Booking[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  invoiceSeq: number;
};

const INDEX = "mn:bookings";
const SALON_KEY = "mn:salon";
let client: RedisClientType | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function bookingsConfigured() {
  if (process.env.REDIS_URL) return true;
  return Boolean(process.env.BOOKINGS_GIST_ID && process.env.BOOKINGS_GITHUB_TOKEN);
}

function scoreOf(booking: Pick<Booking, "dateIso" | "time">) {
  const stamp = `${booking.dateIso.replaceAll("-", "")}${booking.time.replace(":", "")}`;
  return Number(stamp) || Date.now();
}

function emptyStore(bookings: Booking[] = []): SalonStore {
  return { bookings, invoices: [], payments: [], expenses: [], invoiceSeq: 0 };
}

function asBooking(raw: Partial<Booking>): Booking {
  const place = raw.place === "domicile" ? "domicile" : "salon";
  const serviceId = raw.serviceId || "";
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || new Date().toISOString(),
    name: raw.name || "",
    phone: raw.phone || "",
    email: raw.email || "",
    serviceId,
    serviceName: raw.serviceName || "",
    dateIso: raw.dateIso || "",
    dateLabel: raw.dateLabel || "",
    time: raw.time || "",
    place,
    address: raw.address || "",
    status: raw.status || "nouveau",
    amount: typeof raw.amount === "number" ? raw.amount : bookingAmount(serviceId, place),
    paymentStatus: raw.paymentStatus || "unpaid",
    invoiceId: raw.invoiceId,
  };
}

function asInvoice(raw: Partial<Invoice>): Invoice {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: raw.id || crypto.randomUUID(),
    number: raw.number || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    paidAt: raw.paidAt,
    bookingId: raw.bookingId,
    clientName: raw.clientName || "",
    clientPhone: raw.clientPhone || "",
    clientEmail: raw.clientEmail || "",
    items,
    amount: typeof raw.amount === "number" ? raw.amount : invoiceTotal(items),
    status: raw.status || "envoyee",
    paymentMethod: raw.paymentMethod,
    paydunyaToken: raw.paydunyaToken,
    paydunyaUrl: raw.paydunyaUrl,
    note: raw.note,
    kind: raw.kind || (raw.bookingId ? "rdv" : "caisse"),
  };
}

function normalizeStore(raw: unknown): SalonStore {
  if (Array.isArray(raw)) return emptyStore(raw.map((row) => asBooking(row as Partial<Booking>)));
  const o = (raw || {}) as Partial<SalonStore>;
  const store: SalonStore = {
    bookings: Array.isArray(o.bookings) ? o.bookings.map((row) => asBooking(row)) : [],
    invoices: Array.isArray(o.invoices) ? o.invoices.map((row) => asInvoice(row)) : [],
    payments: Array.isArray(o.payments) ? o.payments : [],
    expenses: Array.isArray(o.expenses) ? o.expenses : [],
    invoiceSeq: Number(o.invoiceSeq) || 0,
  };
  if (store.invoiceSeq === 0 && store.invoices.length > 0) store.invoiceSeq = store.invoices.length;
  return store;
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
    "User-Agent": "MAC-NATION",
  };
}

async function gistRequest(url: string, init: RequestInit, label: "LOAD" | "SAVE") {
  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(url, { ...init, cache: "no-store" });
    lastStatus = res.status;
    if (res.ok) return res;
    lastBody = await res.text().catch(() => "");
    const retryable = lastStatus === 429 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504;
    if (!retryable || attempt === 4) break;
    await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
  }
  console.error(`GIST_${label}`, lastStatus, lastBody.slice(0, 400));
  throw new Error(`GIST_${label}_${lastStatus}`);
}

async function loadFromGist(): Promise<SalonStore> {
  const id = process.env.BOOKINGS_GIST_ID;
  if (!id) throw new Error("GIST_MISSING");
  const res = await gistRequest(`https://api.github.com/gists/${id}`, { headers: await gistHeaders() }, "LOAD");
  const gist = (await res.json()) as { files?: Record<string, { content?: string }> };
  const salonRaw = gist.files?.["salon.json"]?.content;
  if (salonRaw) return normalizeStore(JSON.parse(salonRaw));
  const bookingsRaw = gist.files?.["bookings.json"]?.content || "[]";
  return normalizeStore(JSON.parse(bookingsRaw));
}

async function saveToGist(store: SalonStore) {
  const id = process.env.BOOKINGS_GIST_ID;
  if (!id) throw new Error("GIST_MISSING");
  await gistRequest(
    `https://api.github.com/gists/${id}`,
    {
      method: "PATCH",
      headers: { ...(await gistHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({
        files: {
          "salon.json": { content: JSON.stringify(store) },
        },
      }),
    },
    "SAVE",
  );
}

async function loadFromRedis(): Promise<SalonStore> {
  const db = await redis();
  const raw = await db.get(SALON_KEY);
  if (raw) return normalizeStore(JSON.parse(raw));
  const ids = await db.zRange(INDEX, 0, -1);
  if (ids.length === 0) return emptyStore();
  const rows = await db.mGet(ids.map((id) => `mn:booking:${id}`));
  const bookings = rows
    .map((row) => {
      if (!row) return null;
      try {
        return asBooking(JSON.parse(row) as Partial<Booking>);
      } catch {
        return null;
      }
    })
    .filter((row): row is Booking => Boolean(row));
  return emptyStore(bookings);
}

async function saveToRedis(store: SalonStore) {
  const db = await redis();
  await db.set(SALON_KEY, JSON.stringify(store));
}

export async function loadStore(): Promise<SalonStore> {
  if (process.env.REDIS_URL) return loadFromRedis();
  return loadFromGist();
}

async function saveStore(store: SalonStore) {
  if (process.env.REDIS_URL) {
    await saveToRedis(store);
    return;
  }
  await saveToGist(store);
}

export async function mutateStore<T>(fn: (store: SalonStore) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const store = await loadStore();
    const result = await fn(store);
    await saveStore(store);
    return result;
  }) as Promise<T>;
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function nextInvoiceNumber(store: SalonStore) {
  store.invoiceSeq += 1;
  return `FAC-${new Date().getFullYear()}-${String(store.invoiceSeq).padStart(4, "0")}`;
}

function makeInvoice(store: SalonStore, input: {
  bookingId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  items: InvoiceLine[];
  note?: string;
  status?: InvoiceStatus;
  kind?: InvoiceKind;
}): Invoice {
  const items = input.items.filter((line) => line.name.trim() && line.qty > 0);
  const amount = invoiceTotal(items);
  return {
    id: crypto.randomUUID(),
    number: nextInvoiceNumber(store),
    createdAt: new Date().toISOString(),
    bookingId: input.bookingId,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    items,
    amount,
    status: input.status || (amount > 0 ? "envoyee" : "brouillon"),
    note: input.note,
    kind: input.kind || (input.bookingId ? "rdv" : "caisse"),
  };
}

export async function createBooking(input: Omit<Booking, "id" | "createdAt" | "status" | "amount" | "paymentStatus" | "invoiceId">) {
  return mutateStore((store) => {
    const amount = bookingAmount(input.serviceId, input.place);
    const booking: Booking = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "nouveau",
      amount,
      paymentStatus: "unpaid",
    };
    const invoice = makeInvoice(store, {
      bookingId: booking.id,
      clientName: booking.name,
      clientPhone: booking.phone,
      clientEmail: booking.email,
      items: bookingLines(booking.serviceName, booking.serviceId, booking.place),
      note: `${booking.dateLabel} · ${booking.time} · ${booking.place === "domicile" ? booking.address : "Salon Nord Foire"}`,
      kind: "rdv",
    });
    booking.invoiceId = invoice.id;
    booking.amount = invoice.amount;
    store.bookings.push(booking);
    store.invoices.push(invoice);
    return booking;
  });
}

export async function listBookings() {
  const store = await loadStore();
  return store.bookings.slice().sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt));
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  return mutateStore((store) => {
    const booking = store.bookings.find((item) => item.id === id);
    if (!booking) return null;
    booking.status = status;
    if (status === "annule" && booking.invoiceId) {
      const invoice = store.invoices.find((item) => item.id === booking.invoiceId);
      if (invoice && invoice.status !== "payee") invoice.status = "annulee";
    }
    return booking;
  });
}

export async function getInvoice(id: string) {
  const store = await loadStore();
  return store.invoices.find((item) => item.id === id) || null;
}

export async function invoiceForBooking(bookingId: string) {
  return mutateStore((store) => {
    const booking = store.bookings.find((item) => item.id === bookingId);
    if (!booking) return null;
    const existing = booking.invoiceId ? store.invoices.find((item) => item.id === booking.invoiceId) : store.invoices.find((item) => item.bookingId === booking.id);
    if (existing) return existing;
    const invoice = makeInvoice(store, {
      bookingId: booking.id,
      clientName: booking.name,
      clientPhone: booking.phone,
      clientEmail: booking.email,
      items: bookingLines(booking.serviceName, booking.serviceId, booking.place),
      note: `${booking.dateLabel} · ${booking.time}`,
      kind: "rdv",
    });
    booking.invoiceId = invoice.id;
    booking.amount = invoice.amount;
    store.invoices.push(invoice);
    return invoice;
  });
}

export async function createWalkInInvoice(input: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  items: InvoiceLine[];
  note?: string;
  kind?: InvoiceKind;
}) {
  return mutateStore((store) => {
    const invoice = makeInvoice(store, {
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail || "",
      items: input.items,
      note: input.note,
      kind: input.kind,
    });
    store.invoices.push(invoice);
    return invoice;
  });
}

export async function updateInvoice(id: string, patch: { items?: InvoiceLine[]; status?: InvoiceStatus; note?: string; amount?: number }) {
  return mutateStore((store) => {
    const invoice = store.invoices.find((item) => item.id === id);
    if (!invoice) return null;
    if (patch.items) {
      invoice.items = patch.items;
      invoice.amount = invoiceTotal(patch.items);
    }
    if (typeof patch.amount === "number") {
      invoice.amount = patch.amount;
      if (invoice.items.length === 0) {
        invoice.items = [{ name: "Prestation", qty: 1, unitPrice: patch.amount }];
      } else if (invoice.items.length === 1) {
        invoice.items[0].unitPrice = patch.amount;
      } else {
        const rest = invoice.items.slice(1).reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
        invoice.items[0].unitPrice = Math.max(0, patch.amount - rest);
        invoice.amount = invoiceTotal(invoice.items);
      }
    }
    if (invoice.bookingId) {
      const booking = store.bookings.find((item) => item.id === invoice.bookingId);
      if (booking) booking.amount = invoice.amount;
    }
    if (patch.status) invoice.status = patch.status;
    if (patch.note !== undefined) invoice.note = patch.note;
    return invoice;
  });
}

export async function attachPaydunya(invoiceId: string, token: string, url: string) {
  return mutateStore((store) => {
    const invoice = store.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return null;
    invoice.paydunyaToken = token;
    invoice.paydunyaUrl = url;
    if (invoice.status !== "payee") invoice.status = "envoyee";
    if (invoice.bookingId) {
      const booking = store.bookings.find((item) => item.id === invoice.bookingId);
      if (booking && booking.paymentStatus === "unpaid") booking.paymentStatus = "pending";
    }
    return invoice;
  });
}

export async function markInvoicePaid(opts: {
  invoiceId?: string;
  paydunyaToken?: string;
  method: PaymentMethod;
  amount?: number;
  note?: string;
}) {
  return mutateStore((store) => {
    const invoice = store.invoices.find(
      (item) => item.id === opts.invoiceId || (opts.paydunyaToken && item.paydunyaToken === opts.paydunyaToken),
    );
    if (!invoice) return null;
    if (invoice.status === "payee") {
      return {
        invoice,
        payment: store.payments.find((item) => item.invoiceId === invoice.id && item.status === "completed") || null,
        created: false,
      };
    }
    invoice.status = "payee";
    invoice.paidAt = new Date().toISOString();
    invoice.paymentMethod = opts.method;
    if (opts.paydunyaToken) invoice.paydunyaToken = opts.paydunyaToken;
    const payment: Payment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      invoiceId: invoice.id,
      bookingId: invoice.bookingId,
      amount: opts.amount ?? invoice.amount,
      method: opts.method,
      status: "completed",
      note: opts.note,
      paydunyaToken: opts.paydunyaToken || invoice.paydunyaToken,
    };
    store.payments.push(payment);
    if (invoice.bookingId) {
      const booking = store.bookings.find((item) => item.id === invoice.bookingId);
      if (booking) booking.paymentStatus = "paid";
    }
    return { invoice, payment, created: true };
  });
}

export async function addExpense(input: { dateIso: string; category: ExpenseCategory; amount: number; note: string }) {
  return mutateStore((store) => {
    const expense: Expense = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      dateIso: input.dateIso,
      category: input.category,
      amount: input.amount,
      note: input.note,
    };
    store.expenses.push(expense);
    return expense;
  });
}

export async function deleteExpense(id: string) {
  return mutateStore((store) => {
    const index = store.expenses.findIndex((item) => item.id === id);
    if (index < 0) return false;
    store.expenses.splice(index, 1);
    return true;
  });
}

export async function getSalon() {
  const store = await loadStore();
  return {
    bookings: store.bookings.slice().sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt)),
    invoices: store.invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: store.payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    expenses: store.expenses.slice().sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.createdAt.localeCompare(a.createdAt)),
  };
}
