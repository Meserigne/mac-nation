import { createClient, type RedisClientType } from "redis";
import { hashPin, pinOk } from "@/lib/client-auth";
import { addDays, planPerks, pointsForAmount, REDEEM_FCFA, REDEEM_POINTS } from "@/lib/loyalty";
import { bookingAmount, bookingLines, invoiceTotal, type ExpenseCategory, type InvoiceLine, type PaymentMethod } from "@/lib/money";
import { normalizePhone } from "@/lib/sms";

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
  clientId?: string;
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
  clientId?: string;
  planId?: string;
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

export type ApplicationStatus = "nouvelle" | "vue" | "retenue" | "refusee";

export type Application = {
  id: string;
  createdAt: string;
  jobId: string;
  jobTitle: string;
  name: string;
  phone: string;
  email: string;
  letter: string;
  cvName: string;
  cvPath: string;
  letterName?: string;
  letterPath?: string;
  status: ApplicationStatus;
};

export type MembershipStatus = "actif" | "expire" | "annule";

export type Client = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  pinHash: string;
  points: number;
  creditFcfa: number;
  googleId?: string;
  appleId?: string;
  facebookId?: string;
};

export type LoyaltyEvent = {
  id: string;
  createdAt: string;
  clientId: string;
  kind: "earn" | "redeem" | "adjust";
  points: number;
  creditFcfa: number;
  label: string;
  invoiceId?: string;
};

export type Membership = {
  id: string;
  createdAt: string;
  clientId: string;
  planId: string;
  planName: string;
  startedAt: string;
  expiresAt: string;
  visitsTotal: number;
  visitsUsed: number;
  boutiquePercent: number;
  status: MembershipStatus;
  invoiceId?: string;
};

export type SalonStore = {
  bookings: Booking[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  applications: Application[];
  clients: Client[];
  loyalty: LoyaltyEvent[];
  memberships: Membership[];
  invoiceSeq: number;
};

const INDEX = "mn:bookings";
const SALON_KEY = "mn:salon";
const STORE_REPO = process.env.BOOKINGS_GITHUB_REPO || "Meserigne/mac-nation";
const STORE_PATH = "salon-store.json";
const STORE_BRANCH = "salon-data";
let client: RedisClientType | null = null;
let queue: Promise<unknown> = Promise.resolve();
let repoSha: string | null = null;

export function bookingsConfigured() {
  if (process.env.REDIS_URL) return true;
  return Boolean(process.env.BOOKINGS_GIST_ID && process.env.BOOKINGS_GITHUB_TOKEN);
}

function scoreOf(booking: Pick<Booking, "dateIso" | "time">) {
  const stamp = `${booking.dateIso.replaceAll("-", "")}${booking.time.replace(":", "")}`;
  return Number(stamp) || Date.now();
}

function emptyStore(bookings: Booking[] = []): SalonStore {
  return {
    bookings,
    invoices: [],
    payments: [],
    expenses: [],
    applications: [],
    clients: [],
    loyalty: [],
    memberships: [],
    invoiceSeq: 0,
  };
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
    clientId: raw.clientId,
  };
}

function asApplication(raw: Partial<Application>): Application {
  const status: ApplicationStatus =
    raw.status === "vue" || raw.status === "retenue" || raw.status === "refusee" ? raw.status : "nouvelle";
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || new Date().toISOString(),
    jobId: raw.jobId || "",
    jobTitle: raw.jobTitle || "",
    name: raw.name || "",
    phone: raw.phone || "",
    email: raw.email || "",
    letter: raw.letter || "",
    cvName: raw.cvName || "cv.pdf",
    cvPath: raw.cvPath || "",
    letterName: raw.letterName,
    letterPath: raw.letterPath,
    status,
  };
}

function asClient(raw: Partial<Client>): Client {
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || new Date().toISOString(),
    name: raw.name || "",
    phone: raw.phone || "",
    email: raw.email || "",
    pinHash: raw.pinHash || "",
    points: Number(raw.points) || 0,
    creditFcfa: Number(raw.creditFcfa) || 0,
    googleId: raw.googleId,
    appleId: raw.appleId,
    facebookId: raw.facebookId,
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
    clientId: raw.clientId,
    planId: raw.planId,
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
    applications: Array.isArray(o.applications) ? o.applications.map((row) => asApplication(row)) : [],
    clients: Array.isArray(o.clients) ? o.clients.map((row) => asClient(row)) : [],
    loyalty: Array.isArray(o.loyalty) ? o.loyalty : [],
    memberships: Array.isArray(o.memberships) ? o.memberships : [],
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

async function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.BOOKINGS_GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "MAC-NATION",
  };
}

async function githubRequest(url: string, init: RequestInit, label: "LOAD" | "SAVE") {
  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { ...init, cache: "no-store" });
    lastStatus = res.status;
    if (res.ok) return res;
    lastBody = await res.text().catch(() => "");
    const retryable = lastStatus === 429 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504;
    if (!retryable || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
  }
  console.error(`GH_${label}`, lastStatus, lastBody.slice(0, 400));
  throw new Error(`GH_${label}_${lastStatus}`);
}

async function loadFromRepo(): Promise<SalonStore> {
  const res = await githubRequest(
    `https://api.github.com/repos/${STORE_REPO}/contents/${STORE_PATH}?ref=${STORE_BRANCH}`,
    { headers: await ghHeaders() },
    "LOAD",
  );
  const json = (await res.json()) as { sha?: string; content?: string };
  repoSha = json.sha || null;
  const raw = Buffer.from((json.content || "").replaceAll("\n", ""), "base64").toString("utf8");
  return normalizeStore(JSON.parse(raw || "{}"));
}

async function saveToRepo(store: SalonStore) {
  const res = await githubRequest(
    `https://api.github.com/repos/${STORE_REPO}/contents/${STORE_PATH}`,
    {
      method: "PUT",
      headers: { ...(await ghHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update salon store",
        content: Buffer.from(JSON.stringify(store)).toString("base64"),
        branch: STORE_BRANCH,
        ...(repoSha ? { sha: repoSha } : {}),
      }),
    },
    "SAVE",
  );
  const json = (await res.json()) as { content?: { sha?: string } };
  repoSha = json.content?.sha || repoSha;
}

async function gistHeaders() {
  return ghHeaders();
}

async function gistRequest(url: string, init: RequestInit, label: "LOAD" | "SAVE") {
  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, { ...init, cache: "no-store" });
    lastStatus = res.status;
    if (res.ok) return res;
    lastBody = await res.text().catch(() => "");
    const retryable = lastStatus === 429 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504;
    if (!retryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
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
  try {
    return await loadFromRepo();
  } catch (error) {
    console.error("Repo load failed, falling back to gist", error);
    return loadFromGist();
  }
}

async function saveStore(store: SalonStore) {
  if (process.env.REDIS_URL) {
    await saveToRedis(store);
    return;
  }
  await saveToRepo(store);
}

export async function mutateStore<T>(fn: (store: SalonStore) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    let last: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const store = await loadStore();
        const result = await fn(store);
        await saveStore(store);
        return result;
      } catch (error) {
        last = error;
        const message = error instanceof Error ? error.message : "";
        if (!/_(409|429|502|503|504)$/.test(message) || attempt === 3) throw error;
        repoSha = null;
        await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
      }
    }
    throw last;
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

export type OauthProvider = "google" | "apple" | "facebook";

export type PublicClient = Omit<Client, "pinHash" | "googleId" | "appleId" | "facebookId"> & {
  providers: OauthProvider[];
};

function publicClient(client: Client): PublicClient {
  const providers: OauthProvider[] = [];
  if (client.googleId) providers.push("google");
  if (client.appleId) providers.push("apple");
  if (client.facebookId) providers.push("facebook");
  return {
    id: client.id,
    createdAt: client.createdAt,
    name: client.name,
    phone: client.phone,
    email: client.email,
    points: client.points,
    creditFcfa: client.creditFcfa,
    providers,
  };
}

function samePhone(a: string, b: string) {
  return Boolean(a && b && normalizePhone(a) === normalizePhone(b));
}

function ensureClientCollections(store: SalonStore) {
  if (!store.clients) store.clients = [];
  if (!store.loyalty) store.loyalty = [];
  if (!store.memberships) store.memberships = [];
}

function findClient(store: SalonStore, clientId?: string, phone?: string) {
  ensureClientCollections(store);
  if (clientId) {
    const byId = store.clients.find((item) => item.id === clientId);
    if (byId) return byId;
  }
  if (phone) return store.clients.find((item) => samePhone(item.phone, phone)) || null;
  return null;
}

function refreshMemberships(store: SalonStore) {
  ensureClientCollections(store);
  const now = Date.now();
  for (const membership of store.memberships) {
    if (membership.status === "actif" && new Date(membership.expiresAt).getTime() < now) {
      membership.status = "expire";
    }
  }
}

function planIdFromInvoice(invoice: Invoice) {
  if (invoice.planId) return invoice.planId;
  const name = (invoice.items[0]?.name || "").toLowerCase();
  if (name.includes("nation")) return "nation";
  if (name.includes("essentiel")) return "essentiel";
  if (name.includes("signature")) return "signature";
  return "signature";
}

function activateMembership(store: SalonStore, client: Client, invoice: Invoice) {
  if (store.memberships.some((item) => item.invoiceId === invoice.id)) return;
  const planId = planIdFromInvoice(invoice);
  const perks = planPerks(planId);
  const now = new Date().toISOString();
  for (const membership of store.memberships) {
    if (membership.clientId === client.id && membership.status === "actif") membership.status = "expire";
  }
  store.memberships.push({
    id: crypto.randomUUID(),
    createdAt: now,
    clientId: client.id,
    planId,
    planName: perks.name,
    startedAt: now,
    expiresAt: addDays(now, 30),
    visitsTotal: perks.visits,
    visitsUsed: 0,
    boutiquePercent: perks.boutiquePercent,
    status: "actif",
    invoiceId: invoice.id,
  });
}

function awardPaidInvoice(store: SalonStore, invoice: Invoice) {
  const client = findClient(store, invoice.clientId, invoice.clientPhone);
  if (!client) return;
  invoice.clientId = client.id;
  if (!store.loyalty.some((item) => item.invoiceId === invoice.id && item.kind === "earn")) {
    const pts = pointsForAmount(invoice.amount);
    if (pts > 0) {
      client.points += pts;
      store.loyalty.push({
        id: crypto.randomUUID(),
        createdAt: invoice.paidAt || new Date().toISOString(),
        clientId: client.id,
        kind: "earn",
        points: pts,
        creditFcfa: 0,
        label: `Achat ${invoice.number}`,
        invoiceId: invoice.id,
      });
    }
  }
  if (invoice.kind === "abonnement") activateMembership(store, client, invoice);
}

function consumeMembershipVisit(store: SalonStore, booking: Booking) {
  const client = findClient(store, booking.clientId, booking.phone);
  if (!client) return;
  booking.clientId = client.id;
  refreshMemberships(store);
  const membership = store.memberships
    .filter((item) => item.clientId === client.id && item.status === "actif" && item.visitsUsed < item.visitsTotal)
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0];
  if (!membership) return;
  membership.visitsUsed += 1;
}

function linkClientHistory(store: SalonStore, client: Client) {
  for (const booking of store.bookings) {
    if (!booking.clientId && samePhone(booking.phone, client.phone)) booking.clientId = client.id;
  }
  for (const invoice of store.invoices) {
    if (!invoice.clientId && samePhone(invoice.clientPhone, client.phone)) invoice.clientId = client.id;
  }
  const monthAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const paid = store.invoices
    .filter((item) => item.clientId === client.id && item.status === "payee")
    .sort((a, b) => (a.paidAt || a.createdAt).localeCompare(b.paidAt || b.createdAt));
  for (const invoice of paid) {
    const paidAt = new Date(invoice.paidAt || invoice.createdAt).getTime();
    if (invoice.kind === "abonnement" && paidAt < monthAgo) {
      if (!store.loyalty.some((item) => item.invoiceId === invoice.id && item.kind === "earn")) {
        const pts = pointsForAmount(invoice.amount);
        if (pts > 0) {
          client.points += pts;
          store.loyalty.push({
            id: crypto.randomUUID(),
            createdAt: invoice.paidAt || invoice.createdAt,
            clientId: client.id,
            kind: "earn",
            points: pts,
            creditFcfa: 0,
            label: `Achat ${invoice.number}`,
            invoiceId: invoice.id,
          });
        }
      }
      continue;
    }
    awardPaidInvoice(store, invoice);
  }
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
  clientId?: string;
  planId?: string;
}): Invoice {
  const items = input.items.filter((line) => line.name.trim() && line.qty > 0);
  const amount = invoiceTotal(items);
  const client = findClient(store, input.clientId, input.clientPhone);
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
    clientId: client?.id || input.clientId,
    planId: input.planId,
  };
}

export function buildWalkInInvoice(input: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  items: InvoiceLine[];
  note?: string;
  kind?: InvoiceKind;
  clientId?: string;
  planId?: string;
}): Invoice {
  const items = input.items.filter((line) => line.name.trim() && line.qty > 0);
  return {
    id: crypto.randomUUID(),
    number: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    createdAt: new Date().toISOString(),
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail || "",
    items,
    amount: invoiceTotal(items),
    status: "envoyee",
    note: input.note,
    kind: input.kind || "caisse",
    clientId: input.clientId,
    planId: input.planId,
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
      clientId: booking.clientId,
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
    if (status === "termine") consumeMembershipVisit(store, booking);
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
      clientId: booking.clientId,
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
  clientId?: string;
  planId?: string;
}) {
  return mutateStore((store) => {
    const invoice = makeInvoice(store, {
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail || "",
      items: input.items,
      note: input.note,
      kind: input.kind,
      clientId: input.clientId,
      planId: input.planId,
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
  snapshot?: Partial<Invoice>;
}) {
  return mutateStore((store) => {
    let invoice = store.invoices.find(
      (item) => item.id === opts.invoiceId || (opts.paydunyaToken && item.paydunyaToken === opts.paydunyaToken),
    );
    if (!invoice && opts.snapshot && (opts.invoiceId || opts.snapshot.id)) {
      const snap = opts.snapshot;
      invoice = {
        id: opts.invoiceId || snap.id || crypto.randomUUID(),
        number: snap.number || `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        createdAt: snap.createdAt || new Date().toISOString(),
        bookingId: snap.bookingId,
        clientName: snap.clientName || "",
        clientPhone: snap.clientPhone || "",
        clientEmail: snap.clientEmail || "",
        items: snap.items || [],
        amount: snap.amount || opts.amount || 0,
        status: "envoyee",
        kind: snap.kind,
        note: snap.note,
        clientId: snap.clientId,
        planId: snap.planId,
      };
      store.invoices.push(invoice);
    }
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
    awardPaidInvoice(store, invoice);
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

function fileExt(name: string, mime: string) {
  const fromName = name.toLowerCase().match(/\.(pdf|docx?|jpe?g|png)$/)?.[0];
  if (fromName) return fromName;
  if (mime === "application/pdf") return ".pdf";
  if (mime === "application/msword") return ".doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  return ".bin";
}

export async function putRepoFile(path: string, bytes: Buffer, message: string) {
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const metaRes = await fetch(`https://api.github.com/repos/${STORE_REPO}/contents/${encoded}?ref=${STORE_BRANCH}`, {
    headers: await ghHeaders(),
    cache: "no-store",
  });
  const meta = metaRes.ok ? ((await metaRes.json()) as { sha?: string }) : null;
  const res = await githubRequest(
    `https://api.github.com/repos/${STORE_REPO}/contents/${encoded}`,
    {
      method: "PUT",
      headers: { ...(await ghHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: bytes.toString("base64"),
        branch: STORE_BRANCH,
        ...(meta?.sha ? { sha: meta.sha } : {}),
      }),
    },
    "SAVE",
  );
  await res.json().catch(() => null);
  return path;
}

export async function getRepoFile(path: string) {
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const res = await githubRequest(
    `https://api.github.com/repos/${STORE_REPO}/contents/${encoded}?ref=${STORE_BRANCH}`,
    { headers: await ghHeaders() },
    "LOAD",
  );
  const json = (await res.json()) as { content?: string; encoding?: string; download_url?: string };
  if (json.content) {
    return Buffer.from(json.content.replaceAll("\n", ""), "base64");
  }
  if (json.download_url) {
    const file = await fetch(json.download_url, { cache: "no-store" });
    if (!file.ok) throw new Error(`GH_LOAD_${file.status}`);
    return Buffer.from(await file.arrayBuffer());
  }
  throw new Error("FILE_MISSING");
}

export async function createApplication(input: {
  jobId: string;
  jobTitle: string;
  name: string;
  phone: string;
  email: string;
  letter: string;
  cv: { name: string; type: string; bytes: Buffer };
  letterFile?: { name: string; type: string; bytes: Buffer };
}) {
  const id = crypto.randomUUID();
  const cvExt = fileExt(input.cv.name, input.cv.type);
  const cvPath = `applications/${id}-cv${cvExt}`;
  await putRepoFile(cvPath, input.cv.bytes, `Candidature CV ${input.name}`);
  let letterPath: string | undefined;
  let letterName: string | undefined;
  if (input.letterFile) {
    const letterExt = fileExt(input.letterFile.name, input.letterFile.type);
    letterPath = `applications/${id}-lettre${letterExt}`;
    letterName = input.letterFile.name;
    await putRepoFile(letterPath, input.letterFile.bytes, `Candidature lettre ${input.name}`);
  }
  return mutateStore((store) => {
    if (!store.applications) store.applications = [];
    const application: Application = {
      id,
      createdAt: new Date().toISOString(),
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      name: input.name,
      phone: input.phone,
      email: input.email,
      letter: input.letter,
      cvName: input.cv.name || `cv${cvExt}`,
      cvPath,
      letterName,
      letterPath,
      status: "nouvelle",
    };
    store.applications.push(application);
    return application;
  });
}

export async function getApplication(id: string) {
  const store = await loadStore();
  return (store.applications || []).find((item) => item.id === id) || null;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  return mutateStore((store) => {
    const application = (store.applications || []).find((item) => item.id === id);
    if (!application) return null;
    application.status = status;
    return application;
  });
}

export async function cancelClientMembership(clientId: string) {
  return mutateStore((store) => {
    refreshMemberships(store);
    const membership = store.memberships.find((item) => item.clientId === clientId && item.status === "actif");
    if (!membership) return null;
    membership.status = "annule";
    return membership;
  });
}

export async function getSalon() {
  const store = await loadStore();
  refreshMemberships(store);
  return {
    bookings: store.bookings.slice().sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt)),
    invoices: store.invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: store.payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    expenses: store.expenses.slice().sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.createdAt.localeCompare(a.createdAt)),
    applications: (store.applications || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    clients: (store.clients || []).map(publicClient).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    memberships: (store.memberships || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function registerClient(input: { name: string; phone: string; email: string; pin: string }) {
  return mutateStore((store) => {
    ensureClientCollections(store);
    const phone = normalizePhone(input.phone);
    if (store.clients.some((item) => samePhone(item.phone, phone))) throw new Error("PHONE_TAKEN");
    const client: Client = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: input.name.trim(),
      phone,
      email: input.email.trim(),
      pinHash: hashPin(input.pin),
      points: 0,
      creditFcfa: 0,
    };
    store.clients.push(client);
    linkClientHistory(store, client);
    return publicClient(client);
  });
}

export async function loginClient(phone: string, pin: string) {
  const store = await loadStore();
  const client = findClient(store, undefined, phone);
  if (!client || !client.pinHash || !pinOk(pin, client.pinHash)) return null;
  return publicClient(client);
}

export async function getClientSession(clientId: string) {
  const store = await loadStore();
  const client = findClient(store, clientId);
  return client ? publicClient(client) : null;
}

export async function getClientDashboard(clientId: string) {
  const store = await loadStore();
  const client = findClient(store, clientId);
  if (!client) return null;
  refreshMemberships(store);
  const memberships = store.memberships
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const membership = memberships.find((item) => item.status === "actif") || null;
  return {
    client: publicClient(client),
    membership,
    memberships,
    loyalty: store.loyalty
      .filter((item) => item.clientId === client.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30),
    bookings: store.bookings
      .filter((item) => item.clientId === client.id || samePhone(item.phone, client.phone))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    invoices: store.invoices
      .filter((item) => item.clientId === client.id || samePhone(item.clientPhone, client.phone))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    redeemPoints: REDEEM_POINTS,
    redeemFcfa: REDEEM_FCFA,
  };
}

export async function updateClientProfile(
  clientId: string,
  patch: { name?: string; email?: string; pin?: string; phone?: string },
) {
  return mutateStore((store) => {
    const client = findClient(store, clientId);
    if (!client) return null;
    if (patch.name !== undefined) client.name = patch.name.trim();
    if (patch.email !== undefined) client.email = patch.email.trim();
    if (patch.pin) client.pinHash = hashPin(patch.pin);
    if (patch.phone !== undefined) {
      const phone = patch.phone.trim() ? normalizePhone(patch.phone) : "";
      if (phone && store.clients.some((item) => item.id !== client.id && samePhone(item.phone, phone))) {
        throw new Error("PHONE_TAKEN");
      }
      client.phone = phone;
      if (phone) linkClientHistory(store, client);
    }
    return publicClient(client);
  });
}

export async function loginOrRegisterOAuth(input: {
  provider: OauthProvider;
  providerId: string;
  email: string;
  name: string;
}) {
  return mutateStore((store) => {
    ensureClientCollections(store);
    const key = input.provider === "google" ? "googleId" : input.provider === "apple" ? "appleId" : "facebookId";
    const email = input.email.trim().toLowerCase();
    let client =
      store.clients.find((item) => item[key] === input.providerId) ||
      (email ? store.clients.find((item) => item.email.trim().toLowerCase() === email) : undefined);
    if (!client) {
      client = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: input.name.trim() || "Client MAC NATION",
        phone: "",
        email: input.email.trim(),
        pinHash: "",
        points: 0,
        creditFcfa: 0,
        [key]: input.providerId,
      };
      store.clients.push(client);
    } else {
      client[key] = input.providerId;
      if (input.name.trim() && (!client.name || client.name === "Client MAC NATION")) client.name = input.name.trim();
      if (input.email.trim() && !client.email) client.email = input.email.trim();
    }
    return publicClient(client);
  });
}

export async function redeemClientPoints(clientId: string) {
  return mutateStore((store) => {
    const client = findClient(store, clientId);
    if (!client) return null;
    if (client.points < REDEEM_POINTS) throw new Error("POINTS_LOW");
    client.points -= REDEEM_POINTS;
    client.creditFcfa += REDEEM_FCFA;
    store.loyalty.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clientId: client.id,
      kind: "redeem",
      points: -REDEEM_POINTS,
      creditFcfa: REDEEM_FCFA,
      label: `Échange ${REDEEM_POINTS} pts · ${REDEEM_FCFA} F de crédit`,
    });
    return publicClient(client);
  });
}

export async function adjustClient(clientId: string, patch: { pointsDelta?: number; creditDelta?: number; note?: string }) {
  return mutateStore((store) => {
    const client = findClient(store, clientId);
    if (!client) return null;
    const pointsDelta = Number(patch.pointsDelta) || 0;
    const creditDelta = Number(patch.creditDelta) || 0;
    client.points = Math.max(0, client.points + pointsDelta);
    client.creditFcfa = Math.max(0, client.creditFcfa + creditDelta);
    if (pointsDelta || creditDelta) {
      store.loyalty.push({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        clientId: client.id,
        kind: "adjust",
        points: pointsDelta,
        creditFcfa: creditDelta,
        label: patch.note?.trim() || "Ajustement salon",
      });
    }
    return publicClient(client);
  });
}
