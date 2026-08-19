export const DOMICILE_FEE = 2000;

export type PaymentMethod = "especes" | "wave" | "orange" | "free" | "paydunya" | "autre";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "especes", label: "Espèces" },
  { id: "wave", label: "Wave" },
  { id: "orange", label: "Max it" },
  { id: "free", label: "Mixx" },
  { id: "paydunya", label: "PayDunya" },
  { id: "autre", label: "Autre" },
];

export const EXPENSE_CATEGORIES = [
  { id: "loyer", label: "Loyer" },
  { id: "produits", label: "Produits" },
  { id: "salaires", label: "Salaires" },
  { id: "transport", label: "Transport" },
  { id: "divers", label: "Divers" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["id"];

export function parseFcfa(label: string) {
  const n = Number(String(label).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatFcfa(n: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n || 0))} F`;
}

export function bookingAmount(base: number, place: "salon" | "domicile", serviceId: string, domicileFee = DOMICILE_FEE) {
  if (place === "domicile" && serviceId !== "domicile") return base + domicileFee;
  return base;
}

export type InvoiceLine = {
  name: string;
  qty: number;
  unitPrice: number;
};

export function bookingLines(
  serviceName: string,
  base: number,
  place: "salon" | "domicile",
  serviceId: string,
  domicileFee = DOMICILE_FEE,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [{ name: serviceName, qty: 1, unitPrice: base }];
  if (place === "domicile" && serviceId !== "domicile") {
    lines.push({ name: "Déplacement domicile", qty: 1, unitPrice: domicileFee });
  }
  return lines;
}

export function invoiceTotal(items: InvoiceLine[]) {
  return items.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
}

export function methodLabel(method: PaymentMethod) {
  return PAYMENT_METHODS.find((item) => item.id === method)?.label || method;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}
