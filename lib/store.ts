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

export type SalonStore = {
  bookings: Booking[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  applications: Application[];
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
  return { bookings, invoices: [], payments: [], expenses: [], applications: [], invoiceSeq: 0 };
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
    applications: Array.isArray(o.applications) ? o.applications.map((row) => asApplication(row)) : [],
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

export function buildWalkInInvoice(input: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  items: InvoiceLine[];
  note?: string;
  kind?: InvoiceKind;
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

export async function getSalon() {
  const store = await loadStore();
  return {
    bookings: store.bookings.slice().sort((a, b) => scoreOf(a) - scoreOf(b) || a.createdAt.localeCompare(b.createdAt)),
    invoices: store.invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: store.payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    expenses: store.expenses.slice().sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.createdAt.localeCompare(a.createdAt)),
    applications: (store.applications || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
