import { NextResponse } from "next/server";
import { addExpense } from "@/lib/store";
import { EXPENSE_CATEGORIES, todayIso, type ExpenseCategory } from "@/lib/money";

const CATS = new Set<ExpenseCategory>(EXPENSE_CATEGORIES.map((item) => item.id));

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    category?: unknown;
    amount?: unknown;
    note?: unknown;
    dateIso?: unknown;
  } | null;
  const category = typeof body?.category === "string" && CATS.has(body.category as ExpenseCategory) ? (body.category as ExpenseCategory) : "divers";
  const amount = Number(body?.amount) || 0;
  if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const expense = await addExpense({
    category,
    amount,
    note: typeof body?.note === "string" ? body.note.trim() : "",
    dateIso: typeof body?.dateIso === "string" && body.dateIso ? body.dateIso : todayIso(),
  });
  return NextResponse.json({ expense });
}
