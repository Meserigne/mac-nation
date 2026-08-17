import Link from "next/link";

const LINKS = [
  { href: "/rendez-vous", label: "Payer un RDV" },
  { href: "/boutique", label: "Payer la boutique" },
  { href: "/abonnements", label: "Payer un abonnement" },
] as const;

export default function PayBar() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-[1100px] px-6 pb-10">
      <div className="rounded-2xl bg-[#c4a574] px-5 py-5 text-[#0b0b0c] sm:px-7">
        <p className="text-xs font-medium tracking-[0.18em] uppercase">Wave · Orange Money · Free Money</p>
        <p className="font-bebas mt-1 text-3xl sm:text-4xl">Payer en ligne maintenant</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/80"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
