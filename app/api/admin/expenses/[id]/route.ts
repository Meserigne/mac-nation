import { NextResponse } from "next/server";
import { deleteExpense } from "@/lib/store";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
