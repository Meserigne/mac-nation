import Link from "next/link";
import { confirmPaydunya } from "@/lib/paydunya";
import { getInvoice, markInvoicePaid } from "@/lib/store";
import { formatFcfa } from "@/lib/money";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function PaiementRetourPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const invoiceId = first(sp.invoice);
  const token = first(sp.token);
  let invoice = invoiceId ? await getInvoice(invoiceId) : null;

  if (invoice && invoice.status !== "payee") {
    const payToken = token || invoice.paydunyaToken;
    if (payToken) {
      try {
        const confirmed = await confirmPaydunya(payToken);
        if ((confirmed.status || "").toLowerCase() === "completed") {
          const result = await markInvoicePaid({
            invoiceId: invoice.id,
            paydunyaToken: payToken,
            method: "paydunya",
          });
          invoice = result?.invoice || invoice;
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  const paid = invoice?.status === "payee";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#070708] px-5 py-12 text-center">
      <div className="w-full max-w-md rounded-2xl bg-gray-950 p-8 stroke-gradient [--stroke-opacity:0.2]">
        <p className="text-xs tracking-[0.22em] text-[#c4a574]">MAC NATION</p>
        <h1 className="font-bebas mt-3 text-5xl text-white">{paid ? "Paiement reçu" : "Paiement en cours"}</h1>
        <p className="mt-3 text-sm text-gray-400">
          {paid
            ? `${invoice?.number} · ${formatFcfa(invoice?.amount || 0)}. Merci, à tout à l’heure au salon.`
            : "Si tu as validé sur ton téléphone, le paiement arrive dans quelques secondes. Tu peux fermer cette page."}
        </p>
        <Link href="/" className="btn-gold mt-8 inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-medium">
          Retour au site
        </Link>
      </div>
    </main>
  );
}
